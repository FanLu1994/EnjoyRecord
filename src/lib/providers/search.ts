import type { MediaType } from "@/lib/data";
import { pinyin } from "pinyin-pro";
import { logError, logInfo, logWarn } from "@/lib/logger";

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

type SearchOptions = {
  mode?: "popular";
};

const formatCause = (error: unknown) => {
  if (!(error instanceof Error)) return "";
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause) return "";
  return typeof cause === "string" ? cause : JSON.stringify(cause);
};

const redactUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.searchParams.has("api_key")) {
      url.searchParams.set("api_key", "REDACTED");
    }
    if (url.searchParams.has("key")) {
      url.searchParams.set("key", "REDACTED");
    }
    return url.toString();
  } catch {
    return value;
  }
};

const fetchWithLog = async (provider: string, url: string) => {
  const safeUrl = redactUrl(url);
  logInfo("provider request", { provider, url: safeUrl });
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      logWarn("provider response", {
        provider,
        url: safeUrl,
        status: response.status,
      });
    } else {
      logInfo("provider response", {
        provider,
        url: safeUrl,
        status: response.status,
      });
    }
    return response;
  } catch (error) {
    logError("provider fetch failed", {
      provider,
      url: safeUrl,
      error: error instanceof Error ? error.message : String(error),
      detail: formatCause(error) || undefined,
    });
    throw error;
  }
};

const containsHan = (value: string) => /[\p{Script=Han}]/u.test(value);

const toPinyinQuery = (query: string) => {
  if (!containsHan(query)) return query;
  const converted = pinyin(query, { toneType: "none", type: "string" });
  return converted.replace(/\s+/g, " ").trim();
};

const toYear = (value?: string) => {
  if (!value) return undefined;
  const year = Number(value.slice(0, 4));
  return Number.isNaN(year) ? undefined : year;
};

const collectResults = (results: Array<PromiseSettledResult<SearchItem[]>>) => {
  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const errors = results
    .filter((result) => result.status === "rejected")
    .map((result) =>
      result.status === "rejected"
        ? result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)
        : ""
    )
    .filter(Boolean);
  return { items, errors };
};

const searchOpenLibrary = async (query: string): Promise<SearchItem[]> => {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    toPinyinQuery(query)
  )}`;
  const response = await fetchWithLog("openlibrary", url);
  if (!response.ok) {
    throw new Error("Open Library 请求失败");
  }
  const data = (await response.json()) as {
    docs: Array<{
      key: string;
      title: string;
      author_name?: string[];
      first_publish_year?: number;
      cover_i?: number;
      subtitle?: string;
    }>;
  };

  return data.docs.slice(0, 3).map((doc) => ({
    sources: ["openlibrary"],
    sourceIds: { openlibrary: doc.key },
    type: "book",
    title: doc.title,
    originalTitle: doc.subtitle,
    year: doc.first_publish_year,
    summary: doc.author_name?.length
      ? `作者：${doc.author_name.join(" / ")}`
      : undefined,
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
  }));
};

const searchGoogleBooks = async (query: string): Promise<SearchItem[]> => {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query
  )}&maxResults=3&langRestrict=zh`;
  const response = await fetchWithLog("googlebooks", url);
  if (!response.ok) {
    throw new Error("Google Books 请求失败");
  }
  const data = (await response.json()) as {
    items?: Array<{
      id: string;
      volumeInfo: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        imageLinks?: { thumbnail?: string };
      };
    }>;
  };

  return (
    data.items?.map((item) => ({
      sources: ["googlebooks"],
      sourceIds: { googlebooks: item.id },
      type: "book",
      title: item.volumeInfo.title || "未命名",
      originalTitle: item.volumeInfo.subtitle,
      year: toYear(item.volumeInfo.publishedDate),
    summary:
      item.volumeInfo.description ||
      (item.volumeInfo.authors?.length
        ? `作者：${item.volumeInfo.authors.join(" / ")}`
        : undefined),
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace(
        "http://",
        "https://"
      ),
    })) ?? []
  );
};

const searchTmdb = async (
  query: string,
  kind: "movie" | "tv"
): Promise<SearchItem[]> => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 TMDB_API_KEY");
  }
  const url = `https://api.themoviedb.org/3/search/${kind}?query=${encodeURIComponent(
    query
  )}&language=zh-CN&api_key=${apiKey}`;
  const response = await fetchWithLog("tmdb", url);
  if (!response.ok) {
    throw new Error("TMDB 请求失败");
  }
  const data = (await response.json()) as {
    results: Array<{
      id: number;
      title?: string;
      name?: string;
      original_title?: string;
      original_name?: string;
      overview?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path?: string | null;
    }>;
  };

  return data.results.slice(0, 3).map((item) => ({
    sources: ["tmdb"],
    sourceIds: { tmdb: String(item.id) },
    type: kind === "movie" ? "film" : "series",
    title: item.title || item.name || "未命名",
    originalTitle: item.original_title || item.original_name,
    year: toYear(kind === "movie" ? item.release_date : item.first_air_date),
    summary: item.overview,
    coverUrl: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : undefined,
  }));
};

const searchOmdb = async (
  query: string,
  kind: "movie" | "series"
): Promise<SearchItem[]> => {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 OMDB_API_KEY");
  }
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(
    query
  )}&type=${kind}`;
  const response = await fetchWithLog("omdb", url);
  if (!response.ok) {
    throw new Error("OMDb 请求失败");
  }
  const data = (await response.json()) as {
    Search?: Array<{
      Title: string;
      Year: string;
      imdbID: string;
      Poster: string;
    }>;
    Response?: string;
  };

  if (data.Response === "False") return [];

  return (
    data.Search?.slice(0, 3).map((item) => ({
      sources: ["omdb"],
      sourceIds: { omdb: item.imdbID },
      type: kind === "movie" ? "film" : "series",
      title: item.Title,
      year: toYear(item.Year),
      summary: undefined,
      coverUrl: item.Poster !== "N/A" ? item.Poster : undefined,
    })) ?? []
  );
};

const searchRawg = async (query: string): Promise<SearchItem[]> => {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 RAWG_API_KEY");
  }
  const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(
    query
  )}&page_size=3&key=${apiKey}`;
  const response = await fetchWithLog("rawg", url);
  if (!response.ok) {
    throw new Error("RAWG 请求失败");
  }
  const data = (await response.json()) as {
    results: Array<{
      id: number;
      name: string;
      released?: string;
      background_image?: string;
      genres?: Array<{ name: string }>;
      platforms?: Array<{ platform: { name: string } }>;
    }>;
  };

  return data.results.map((item) => ({
    sources: ["rawg"],
    sourceIds: { rawg: String(item.id) },
    type: "game",
    title: item.name,
    year: toYear(item.released),
    summary: item.genres?.length
      ? item.genres.map((genre) => genre.name).join(" / ")
      : undefined,
    coverUrl: item.background_image,
  }));
};

const searchRawgPopular = async (): Promise<SearchItem[]> => {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RAWG_API_KEY");
  }
  const url = `https://api.rawg.io/api/games?ordering=-added&page_size=3&key=${apiKey}`;
  const response = await fetchWithLog("rawg", url);
  if (!response.ok) {
    throw new Error("RAWG request failed");
  }
  const data = (await response.json()) as {
    results: Array<{
      id: number;
      name: string;
      released?: string;
      background_image?: string;
      genres?: Array<{ name: string }>;
    }>;
  };

  return data.results.map((item) => ({
    sources: ["rawg"],
    sourceIds: { rawg: String(item.id) },
    type: "game",
    title: item.name,
    year: toYear(item.released),
    summary: item.genres?.length
      ? item.genres.map((genre) => genre.name).join(" / ")
      : undefined,
    coverUrl: item.background_image,
  }));
};

const searchSteam = async (query: string): Promise<SearchItem[]> => {
  const url = `https://store.steampowered.com/api/storesearch?term=${encodeURIComponent(
    query
  )}&l=schinese&cc=cn`;
  const response = await fetchWithLog("steam", url);
  if (!response.ok) {
    throw new Error("Steam 请求失败");
  }
  const data = (await response.json()) as {
    items?: Array<{
      id: number;
      name: string;
      tiny_image?: string;
    }>;
  };

  return (
    data.items?.slice(0, 3).map((item) => ({
      sources: ["steam"],
      sourceIds: { steam: String(item.id) },
      type: "game",
      title: item.name,
      summary: "来源：Steam",
      coverUrl: item.tiny_image,
    })) ?? []
  );
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const mergeResults = (items: SearchItem[]) => {
  const map = new Map<string, SearchItem>();

  items.forEach((item) => {
    const key = `${item.type}-${normalize(item.title)}-${item.year ?? ""}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...item,
        sources: [...item.sources],
        sourceIds: { ...item.sourceIds },
      });
      return;
    }

    existing.sources = Array.from(
      new Set([...existing.sources, ...item.sources])
    );
    existing.sourceIds = { ...existing.sourceIds, ...item.sourceIds };
    if (!existing.coverUrl && item.coverUrl) existing.coverUrl = item.coverUrl;
    if (!existing.summary && item.summary) existing.summary = item.summary;
    if (!existing.originalTitle && item.originalTitle) {
      existing.originalTitle = item.originalTitle;
    }
    if (!existing.year && item.year) existing.year = item.year;
  });

  return Array.from(map.values());
};

export const searchByType = async (
  type: MediaType,
  query: string,
  options?: SearchOptions
): Promise<SearchItem[]> => {
  if (type === "book") {
    const results = await searchOpenLibrary(query);
    return mergeResults(results);
  }
  if (type === "film") {
    const settled = await Promise.allSettled([
      searchTmdb(query, "movie"),
      searchOmdb(query, "movie"),
    ]);
    const { items, errors } = collectResults(settled);
    if (!items.length && errors.length === settled.length) {
      throw new Error(errors[0] || "Movie providers are unavailable");
    }
    return mergeResults(items);
  }
  if (type === "series") {
    const settled = await Promise.allSettled([
      searchTmdb(query, "tv"),
      searchOmdb(query, "series"),
    ]);
    const { items, errors } = collectResults(settled);
    if (!items.length && errors.length === settled.length) {
      throw new Error(errors[0] || "Series providers are unavailable");
    }
    return mergeResults(items);
  }
  if (type === "game") {
    const settled =
      options?.mode === "popular"
        ? await Promise.allSettled([searchRawgPopular()])
        : await Promise.allSettled([searchRawg(query), searchSteam(query)]);
    const { items, errors } = collectResults(settled);
    if (!items.length && errors.length === settled.length) {
      throw new Error(errors[0] || "Game providers are unavailable");
    }
    return mergeResults(items);
  }
  return [];
};
