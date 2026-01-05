import type { MediaType, RecordStatus } from "@/lib/data";
import { createRecord, getAllRecords } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";
import { isNeoDBTimeout } from "@/lib/neodb-timeout";
import { neodbFetch } from "@/lib/neodb-fetch";

const NEODB_API_BASE = "https://neodb.social/api";

const CATEGORY_TO_TYPE: Record<string, MediaType> = {
  book: "book",
  movie: "film",
  tv: "series",
  game: "game",
};

const SHELF_STATUS: Array<{ shelfType: string; status: RecordStatus }> = [
  { shelfType: "wishlist", status: "planned" },
  { shelfType: "progress", status: "in_progress" },
  { shelfType: "complete", status: "completed" },
  { shelfType: "dropped", status: "paused" },
];

const PAGE_SIZE = 50;

type ShelfPayload = Record<string, unknown>;
type ShelfEntry = Record<string, unknown>;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const pickString = (source: Record<string, unknown> | null, keys: string[]) => {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const pickNumber = (source: Record<string, unknown> | null, keys: string[]) => {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
};

const normalizeKey = (type: MediaType, title: string) =>
  `${type}:${title.trim().toLowerCase()}`;

const clampText = (value: string | undefined, max: number) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const resolveCatalogItem = (entry: ShelfEntry) => {
  const entryRecord = asRecord(entry);
  if (!entryRecord) return { entry: null, item: null };
  const item =
    asRecord(entryRecord.item) ??
    asRecord(entryRecord.subject) ??
    asRecord(entryRecord.catalog_item) ??
    asRecord(entryRecord.target) ??
    entryRecord;
  return { entry: entryRecord, item };
};

const mapShelfEntry = (
  entry: ShelfEntry,
  fallbackType: MediaType,
  status: RecordStatus
) => {
  const { entry: entryRecord, item } = resolveCatalogItem(entry);
  if (!entryRecord || !item) return null;

  const category = pickString(item, ["category", "type"]);
  const resolvedType = category ? CATEGORY_TO_TYPE[category] ?? fallbackType : fallbackType;
  const title =
    pickString(item, ["title", "display_title", "name"]) ??
    pickString(entryRecord, ["title", "name"]);

  if (!resolvedType || !title) return null;

  const originalTitle = pickString(item, ["original_title", "orig_title", "originalTitle"]);
  const year = pickNumber(item, ["year", "pub_year", "published_year"]);
  const summary = pickString(item, ["brief", "description", "summary"]) ?? "";
  const coverUrl = pickString(item, ["cover_image_url", "cover_url", "cover", "coverUrl"]);
  const rating = pickNumber(entryRecord, ["rating_grade", "rating", "rating_grade_display"]) ??
    pickNumber(item, ["rating"]);
  const notes = clampText(pickString(entryRecord, ["comment_text", "comment", "note"]), 200);

  return {
    type: resolvedType,
    title,
    originalTitle,
    year,
    summary,
    coverUrl,
    status,
    rating,
    notes,
  };
};

const fetchShelfPage = async (
  token: string,
  category: string,
  shelfType: string,
  page: number
): Promise<{ entries: ShelfEntry[]; hasNext: boolean }> => {
  const url = new URL(`${NEODB_API_BASE}/me/shelf`);
  url.searchParams.set("category", category);
  url.searchParams.set("shelf_type", shelfType);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(PAGE_SIZE));

  const response = await neodbFetch(
    url.toString(),
    {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token.trim()}`,
      },
    },
    30000 // 30 second timeout for import operations
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("NeoDB API Token 无效，请检查设置");
    }
    throw new Error(`NeoDB API error: ${response.status}`);
  }

  const payload = (await response.json()) as ShelfPayload;
  const entries = (
    Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload.items)
          ? payload.items
          : []
  ) as ShelfEntry[];

  const totalPages = pickNumber(payload, ["pages", "total_pages", "page_count"]);
  const hasNext = totalPages ? page < totalPages : entries.length === PAGE_SIZE;

  return { entries, hasNext };
};

export const importFromNeoDB = async (token: string) => {
  const existing = new Set(
    getAllRecords().map((record) => normalizeKey(record.type, record.title))
  );
  let imported = 0;
  let skipped = 0;
  let total = 0;

  try {
    for (const [category, fallbackType] of Object.entries(CATEGORY_TO_TYPE)) {
      for (const shelf of SHELF_STATUS) {
        let page = 1;
        let hasNext = true;
        while (hasNext) {
          const { entries, hasNext: next } = await fetchShelfPage(
            token,
            category,
            shelf.shelfType,
            page
          );
          total += entries.length;
          for (const entry of entries) {
            const mapped = mapShelfEntry(entry, fallbackType, shelf.status);
            if (!mapped) {
              skipped += 1;
              continue;
            }
            const key = normalizeKey(mapped.type, mapped.title);
            if (existing.has(key)) {
              skipped += 1;
              continue;
            }
            createRecord({
              type: mapped.type,
              title: mapped.title,
              originalTitle: mapped.originalTitle,
              year: mapped.year,
              summary: mapped.summary,
              coverUrl: mapped.coverUrl,
              status: mapped.status,
              rating: mapped.rating,
              notes: mapped.notes,
            });
            existing.add(key);
            imported += 1;
          }
          page += 1;
          hasNext = next;
        }
      }
    }
  } catch (error) {
    await logError("neodb import failed", { error });
    if (isNeoDBTimeout(error)) {
      throw new Error("NeoDB API 请求超时，请稍后重试");
    }
    throw error;
  }

  await logInfo("neodb import completed", { imported, skipped, total });
  return { imported, skipped, total };
};
