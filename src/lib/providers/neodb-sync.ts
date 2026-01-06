// NeoDB API Sync Module
// Syncs records to NeoDB shelf

import axios from "axios";
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
    item_uuid: itemUuid,
    shelf_type: shelfType,
    visibility: 0,
  };

  if (item.summary) {
    body.comment_text = item.summary;
  }

  if (item.rating !== undefined) {
    body.rating_grade = normalizeRatingGrade(item.rating);
  }

  // Use axios with longer timeout for sync operations
  try {
    await axios.post(`${NEODB_API_BASE}/me/shelf`, body, {
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.detail
        || error.response?.data?.error
        || `NeoDB API error: ${error.response?.status || 'unknown'}`;
      throw new Error(errorMessage);
    }
    throw error;
  }
};

/**
 * Fetch shelf items from NeoDB by shelf type
 * @param shelfType - The shelf type (progress/wishlist/complete/dropped)
 * @param token - NeoDB API token
 * @param page - Page number (default: 1)
 */
export const fetchNeoDBShelf = async (
  shelfType: "progress" | "wishlist" | "complete" | "dropped",
  token: string,
  page: number = 1
): Promise<unknown[] | null> => {
  try {
    const url = `${NEODB_API_BASE}/me/shelf/${shelfType}?page=${page}`;

    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
        "Accept": "application/json",
      },
      timeout: 30000,
    });

    return response.data.data || response.data.items || [];
  } catch (error) {
    logError("neodb fetch shelf error", { shelfType, error });
    return null;
  }
};

/**
 * Fetch all shelf items from NeoDB (all four types)
 * @param token - NeoDB API token
 */
export const fetchAllNeoDBShelves = async (
  token: string
): Promise<{
  progress: unknown[];
  wishlist: unknown[];
  complete: unknown[];
  dropped: unknown[];
}> => {
  const shelfTypes = ["progress", "wishlist", "complete", "dropped"] as const;

  const results = await Promise.all(
    shelfTypes.map(async (type) => {
      const items = await fetchNeoDBShelf(type, token);
      return { type, items: items || [] };
    })
  );

  return {
    progress: results.find((r) => r.type === "progress")?.items || [],
    wishlist: results.find((r) => r.type === "wishlist")?.items || [],
    complete: results.find((r) => r.type === "complete")?.items || [],
    dropped: results.find((r) => r.type === "dropped")?.items || [],
  };
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

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (token?.trim()) {
      headers["Authorization"] = `Bearer ${token.trim()}`;
    }

    const response = await axios.get(searchUrl, {
      headers,
      timeout: 30000,
    });

    const items = response.data.data || [];

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
