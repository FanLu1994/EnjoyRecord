"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecordStatus } from "@/lib/data";
import { statusLabels } from "@/lib/labels";
import { getNeoDBToken } from "@/lib/neodb-config";
import StarRating from "@/components/star-rating";
import { useAdminFetch } from "@/components/admin-auth-provider";

interface SearchItem {
  sources: string[];
  sourceIds: Record<string, string>;
  type: "book" | "film" | "series" | "game" | "movie" | "tv";
  title: string;
  originalTitle?: string;
  year?: number;
  summary?: string;
  coverUrl?: string;
}

const statusOptions: RecordStatus[] = ["planned", "in_progress", "completed", "paused"];

export default function NewRecordPage() {
  const router = useRouter();
  const adminFetch = useAdminFetch();
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchItem | null>(null);

  const [form, setForm] = useState({
    title: "",
    status: "planned" as RecordStatus,
    rating: 0,
    notes: "",
  });

  const payloadFromResult = (item: SearchItem) => ({
    type: item.type,
    title: item.title,
    originalTitle: item.originalTitle,
    year: item.year,
    summary: item.summary || `source: ${item.sources.join(", ")}`,
    coverUrl: item.coverUrl,
    status: form.status,
    rating: form.rating > 0 ? form.rating : undefined,
    sourceIds: item.sourceIds,
    notes: form.notes.trim() || undefined,
  });

  const handleSearch = async () => {
    if (!form.title.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const token = getNeoDBToken();
      const response = await adminFetch(
        `/api/search?q=${encodeURIComponent(form.title)}&token=${encodeURIComponent(token)}`
      );
      if (!response.ok) {
        throw new Error("SEARCH_FAILED");
      }
      const data = await response.json();
      const results = (data.results || []) as SearchItem[];

      setSearchResults(results.slice(0, 3)); // Limit to 3 results total
      setSelectedResult(results[0] ?? null);

      if (results.length === 0) {
        setSearchError("WARN: NO_RESULTS_FOUND");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "SEARCH_FAILED";
      setSearchError(`ERR: ${message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    const target = selectedResult ?? searchResults[0];
    if (!target) {
      setSearchError("ERR: NO_RESULT_SELECTED");
      return;
    }
    setSaving(true);
    setSearchError(null);
    try {
      const token = getNeoDBToken();
      const response = await adminFetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "x-neodb-token": token }),
        },
        body: JSON.stringify(payloadFromResult(target)),
      });
      const data = (await response.json()) as {
        record?: { id: string };
        error?: string;
      };
      if (!response.ok || data.error || !data.record) {
        throw new Error(data.error || "SAVE_FAILED");
      }
      router.push(`/items/${data.record.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SAVE_FAILED";
      setSearchError(`ERR: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = { book: "书籍", film: "电影", series: "剧集", game: "游戏" };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="stagger-in">
      {/* Terminal Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-[var(--font-terminal)] text-[#00a86b] text-sm">./new</span>
          <span className="text-[#d4cfc5]">→</span>
          <span className="text-[#9a958f] text-sm">add_record</span>
        </div>
        <p className="text-[#9a958f] text-sm font-[var(--font-mono)]">
          mode: universal_search<span className="term-cursor" />
        </p>
      </header>

      <div className="space-y-4">
        {/* Search Section */}
        <div className="term-card">
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
            <span className="text-[#00a86b]">&gt;</span>
            SEARCH_QUERY
          </h2>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            {/* Search Input */}
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="搜索书名、电影、剧集、游戏..."
              className="term-input flex-1"
            />

            {/* Search Button */}
            <button
              type="submit"
              disabled={searching || !form.title.trim()}
              className="term-btn shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{searching ? "..." : ">>"}</span>
            </button>
          </form>

          {searching && (
            <div className="mt-3 text-xs font-[var(--font-mono)] text-[#6b6560]">
              ... 正在搜索 NeoDB
            </div>
          )}

          {/* Error Message */}
          {searchError && (
            <div className="mt-4 text-xs font-[var(--font-mono)] text-[#c53030]">
              [{searchError}]
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="term-card">
            <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
              <span className="text-[#00a86b]">&gt;</span>
              SEARCH_RESULTS
              <span className="text-[#9a958f]">({searchResults.length})</span>
            </h2>

            <div className="space-y-3">
              {searchResults.map((item, index) => {
                const itemKey =
                  item.sourceIds?.neodb ? `neodb-${item.sourceIds.neodb}` : `${item.type}-${item.title}-${index}`;
                const selected =
                  selectedResult?.sourceIds?.neodb
                    ? selectedResult.sourceIds.neodb === item.sourceIds?.neodb
                    : selectedResult?.title === item.title && selectedResult?.type === item.type;
                return (
                  <div
                    key={itemKey}
                    onClick={() => setSelectedResult(item)}
                    className={`p-3 border cursor-pointer transition-all ${
                      selected
                        ? "border-[#00a86b] bg-[#00a86b]/10"
                        : "border-[#d4cfc5] hover:border-[#00a86b]/50"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Cover */}
                      <div
                        className="shrink-0 w-12 h-16 rounded border border-[#d4cfc5] bg-white"
                        style={{
                          background: item.coverUrl
                            ? `url(${item.coverUrl}) center/cover`
                            : undefined,
                        }}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-[var(--font-terminal)] text-sm text-[#1a1915] truncate">
                            {selected && <span className="text-[#00a86b] mr-2">&gt;</span>}
                            {item.title}
                          </h3>
                          <span className="term-badge text-[10px] shrink-0">
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                        {item.originalTitle && (
                          <p className="text-[#6b6560] text-xs truncate">{item.originalTitle}</p>
                        )}
                        {item.year && (
                          <p className="text-[#9a958f] text-xs">{item.year}</p>
                        )}
                        {item.summary && (
                          <p className="text-[#6b6560] text-xs mt-1 line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        <div className="mt-2 flex gap-1.5">
                          {item.sources.map((source) => (
                            <span key={source} className="term-badge text-[10px]">
                              {source === "neodb" ? "NEODB" : source}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Save Section */}
        <div className="term-card">
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
            <span className="text-[#00a86b]">&gt;</span>
            RECORD_METADATA
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Status */}
            <div>
              <label className="block text-xs text-[#6b6560] mb-2 font-[var(--font-mono)]">
                status=
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as RecordStatus }))
                }
                className="term-select"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs text-[#6b6560] mb-2 font-[var(--font-mono)]">
                rating=
              </label>
              <StarRating
                value={form.rating}
                onChange={(value) => setForm((prev) => ({ ...prev, rating: value }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-[#6b6560] mb-2 font-[var(--font-mono)]">
              review=
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="写一句评价（最多 200 字）"
              maxLength={200}
              rows={3}
              className="term-input w-full resize-none"
            />
            <div className="mt-1 text-[10px] text-[#9a958f] font-[var(--font-mono)]">
              {form.notes.length}/200
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || searchResults.length === 0}
            className="term-btn w-full mt-4 glitch-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{saving ? "[...] SAVING..." : "[>] SAVE_TO_DATABASE"}</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-[#d4cfc5]">
        <div className="flex items-center justify-between text-xs text-[#9a958f] font-[var(--font-mono)]">
          <span>results: {searchResults.length}</span>
          <span>ready</span>
        </div>
      </footer>
    </div>
  );
}
