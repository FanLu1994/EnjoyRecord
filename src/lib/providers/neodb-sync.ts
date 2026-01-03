// NeoDB API Sync Module
// Syncs records to NeoDB shelf

import type { MediaType } from "@/lib/data";
import { logError, logInfo } from "@/lib/logger";

export interface SyncItem {
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  summary?: string;
  coverUrl?: string;
  status: "planned" | "in_progress" | "completed" | "paused";
  rating?: number;
  sourceIds?: Record<string, string>;
}

// NeoDB category mapping
const CATEGORY_MAP: Record<MediaType, string> = {
  book: "book",
  film: "movie",
  series: "tv",
  game: "game",
};

// Shelf status mapping
const SHELF_MAP: Record<string, "wishlist" | "progress" | "complete"> = {
  planned: "wishlist",
  in_progress: "progress",
  completed: "complete",
  paused: "progress",
};

const NEODB_API_BASE = "https://neodb.social/api";

type ShelfType = "wishlist" | "progress" | "complete" | "dropped";

const normalizeNeoDBUuid = (neodbId: string): string => {
  const trimmed = neodbId.trim();
  if (!trimmed) return trimmed;
  const withoutQuery = trimmed.split("?")[0];
  const parts = withoutQuery.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : trimmed;
};

const normalizeRatingGrade = (rating: number): number => {
  const rounded = Math.round(rating);
  return Math.min(10, Math.max(0, rounded));
};

/**
 * Sync a record to NeoDB shelf
 * @param item - The item to sync
 * @param neodbId - The NeoDB catalog item ID
 * @param token - NeoDB API token (requires full access)
 */
export const syncToNeoDB = async (
  item: SyncItem,
  neodbId: string,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  const shelfType = SHELF_MAP[item.status];
  const itemUuid = normalizeNeoDBUuid(neodbId);

  try {
    logInfo("neodb sync", { neodbId, itemUuid, shelfType, rating: item.rating });

    await upsertShelfItem(itemUuid, shelfType, item, token);

    logInfo("neodb sync success", { neodbId, itemUuid });
    return { success: true };
  } catch (error) {
    logError("neodb sync failed", { neodbId, item, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "同步失败",
    };
  }
};

/**
 * Create or update a shelf mark for a NeoDB item
 */
const upsertShelfItem = async (
  itemUuid: string,
  shelfType: ShelfType,
  item: SyncItem,
  token: string
): Promise<void> => {
  const body: Record<string, unknown> = {
    shelf_type: shelfType,
    visibility: 0,
  };

  if (item.summary) {
    body.comment_text = item.summary;
  }

  if (item.rating !== undefined) {
    body.rating_grade = normalizeRatingGrade(item.rating);
  }

  const response = await fetch(`${NEODB_API_BASE}/me/shelf/item/${itemUuid}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `NeoDB API error: ${response.status}`;
    try {
      const error = await response.json();
      if (error?.message) {
        errorMessage = error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }
};

/**
 * Search NeoDB for an item by title and get its ID
 */
export const searchNeoDBItem = async (
  type: MediaType,
  query: string,
  token: string
): Promise<{ id: string; title: string; type: MediaType } | null> => {
  const category = CATEGORY_MAP[type];

  try {
    const searchUrl = `${NEODB_API_BASE}/catalog/search?query=${encodeURIComponent(
      query
    )}&category=${category}`;

    const response = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const items = data.data || [];

    if (items.length > 0) {
      const item = items[0];
      const resolvedId =
        item.uuid || normalizeNeoDBUuid(item.api_url || item.id || "");
      if (!resolvedId) {
        return null;
      }
      return {
        id: resolvedId,
        title: item.title,
        type,
      };
    }

    return null;
  } catch {
    return null;
  }
};
