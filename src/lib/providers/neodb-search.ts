// NeoDB API Search Provider
// Uses NeoDB's catalog search API with token authentication

import type { MediaType } from "@/lib/data";
import { logError, logInfo } from "@/lib/logger";

export interface SearchItem {
  sources: string[];
  sourceIds: Record<string, string>;
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  summary?: string;
  coverUrl?: string;
}

// NeoDB category mapping
const CATEGORY_MAP: Record<MediaType, string> = {
  book: "book",
  film: "movie",
  series: "tv",
  game: "game",
};

const CATEGORY_TO_TYPE: Record<string, MediaType> = {
  book: "book",
  movie: "film",
  tv: "series",
  game: "game",
};

// NeoDB API base URL
const NEODB_API_BASE = "https://neodb.social/api";

const DETAIL_PATH_MAP: Record<MediaType, string> = {
  book: "book",
  film: "movie",
  series: "tv",
  game: "game",
};

/**
 * Search NeoDB catalog for items
 * Uses the public search endpoint: /api/catalog/search
 * @param type - Media type to search
 * @param query - Search query string
 * @param token - Optional NeoDB API token for authentication
 */
export const searchNeoDB = async (
  type: MediaType | undefined,
  query: string,
  token?: string
): Promise<SearchItem[]> => {
  const category = type ? CATEGORY_MAP[type] : undefined;

  try {
    const searchUrl = new URL(`${NEODB_API_BASE}/catalog/search`);
    searchUrl.searchParams.set("query", query);
    if (category) {
      searchUrl.searchParams.set("category", category);
    }

    logInfo("neodb search", { query, type, category, hasToken: !!token });

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    // Add Authorization header if token is provided
    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token.trim()}`;
    }

    const response = await fetch(searchUrl.toString(), { headers });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("NeoDB API Token 无效，请检查设置");
      }
      throw new Error(`NeoDB API error: ${response.status}`);
    }

    const data = (await response.json()) as NeoDBSearchResponse;

    // Parse and transform results
    const items = parseNeoDBResponse(data, type);

    logInfo("neodb search results", {
      query,
      type,
      resultCount: items.length,
    });

    return items;
  } catch (error) {
    logError("neodb search failed", { query, type, error });
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("NeoDB搜索失败，请检查网络连接");
  }
};

/**
 * Parse NeoDB search response and transform to SearchItem format
 */
const parseNeoDBResponse = (
  data: NeoDBSearchResponse,
  type?: MediaType
): SearchItem[] => {
  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data
    .slice(0, 3) // Limit to first 3 results
    .map((item) => ({
      sources: ["neodb"],
      sourceIds: { neodb: item.uuid || item.id },
      type: type ?? CATEGORY_TO_TYPE[item.category] ?? "book",
      title: item.title || item.display_title || "",
      originalTitle: item.original_title || item.orig_title,
      year: item.year
        ? parseInt(String(item.year))
        : item.pub_year
          ? parseInt(String(item.pub_year))
          : undefined,
      summary: item.brief || item.description || "",
      coverUrl: item.cover_image_url || undefined,
    }))
    .filter((item) => item.title);
};

/**
 * Get detailed item information from NeoDB by ID
 * Note: This may require authentication in some cases
 */
export const getNeoDBItem = async (
  id: string,
  type: MediaType,
  token?: string
): Promise<SearchItem | null> => {
  try {
    const detailPath = DETAIL_PATH_MAP[type];
    const itemUrl = `${NEODB_API_BASE}/${detailPath}/${id}`;

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token.trim()}`;
    }

    const response = await fetch(itemUrl, { headers });

    if (!response.ok) {
      throw new Error(`NeoDB API error: ${response.status}`);
    }

    const item = (await response.json()) as NeoDBItem;

    return {
      sources: ["neodb"],
      sourceIds: { neodb: item.uuid || item.id },
      type,
      title: item.title || item.display_title || "",
      originalTitle: item.original_title || item.orig_title,
      year: item.year
        ? parseInt(String(item.year))
        : item.pub_year
          ? parseInt(String(item.pub_year))
          : undefined,
      summary: item.brief || item.description || "",
      coverUrl: item.cover_image_url || undefined,
    };
  } catch (error) {
    logError("neodb get item failed", { id, type, error });
    return null;
  }
};

/**
 * Fallback: Basic search without external API
 * Returns a manual entry item for users to fill in
 */
export const basicSearch = async (
  type: MediaType,
  query: string
): Promise<SearchItem[]> => {
  return [{
    sources: ["manual"],
    sourceIds: { manual: String(Date.now()) },
    type,
    title: query,
    summary: `请手动编辑${type === "book" ? "书籍" : type === "film" ? "电影" : type === "series" ? "剧集" : "游戏"}信息`,
  }];
};

// NeoDB API Response Types
interface NeoDBSearchResponse {
  data: NeoDBItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface NeoDBItem {
  id: string;
  uuid?: string;
  api_url?: string;
  title: string;
  display_title?: string;
  original_title?: string;
  orig_title?: string;
  year?: number;
  pub_year?: number;
  brief?: string;
  description?: string;
  cover_image_url?: string;
  rating?: number;
  category: string;
  url: string;
}
