"use client";

import Link from "next/link";
import type { RecordItem } from "@/lib/data";
import { resolveProgress } from "@/lib/format";
import { statusLabels, statusBadgeClass } from "@/lib/labels";
import { StarDisplay } from "@/components/star-rating";

interface HomeClientProps {
  records: RecordItem[];
}

const formatProgress = (progress: RecordItem["progress"]) => {
  if (!progress) return null;
  const unitLabels = { pages: "p", chapters: "ch", episodes: "ep", hours: "h" };
  return `${progress.current}${progress.total ? `/${progress.total}` : ""}${unitLabels[progress.unit] || ""}`;
};

const typeIcon = (type: RecordItem["type"]) => {
  const icons = {
    book: "",
    film: "",
    series: "",
    game: "",
  };
  return icons[type] || "";
};

export default function HomeClient({ records }: HomeClientProps) {
  return (
    <div className="stagger-in">
      {/* Header with enhanced visual hierarchy */}
      <header className="mb-10 fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-[var(--font-terminal)] text-[#00a86b] text-sm tracking-wide">./home</span>
          <span className="text-[#d4cfc5] text-xs">/</span>
          <span className="text-[#9a958f] text-sm">records</span>
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-[#1a1915] text-xl font-[var(--font-terminal)] tracking-wide">
            DATABASE
          </h1>
          <span className="text-[#9a958f] text-xs font-[var(--font-mono)]">
            {records.length} {records.length === 1 ? "entry" : "entries"} loaded
          </span>
        </div>
        <div className="h-px bg-gradient-to-r from-[#00a86b] via-[#d4cfc5] to-transparent mt-4 opacity-40" />
      </header>

      {records.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
          {records.map((item, index) => {
            const progress = resolveProgress(item);
            const delay = Math.min(index * 60, 300);
            return (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="block group break-inside-avoid"
                style={{
                  animation: `fadeInUp 0.4s ease-out ${delay}ms forwards`,
                  opacity: 0,
                }}
              >
                <article className="bg-white p-3 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer border border-black/5 hover:border-black/10 rounded-xl mb-3">
                  {/* Cover Image */}
                  <div
                    className="w-full aspect-[3/4] rounded-lg border border-black/5 bg-white flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow transition-shadow duration-200 mb-3"
                    style={{
                      background: item.coverUrl
                        ? `url(${item.coverUrl}) center/cover`
                        : `linear-gradient(145deg, ${item.cover.tone} 0%, ${item.cover.accent} 100%)`,
                    }}
                  >
                    {!item.coverUrl && (
                      <span className="font-[var(--font-terminal)] text-4xl text-[#9a958f]/70">
                        {typeIcon(item.type)}
                      </span>
                    )}
                  </div>

                  {/* Title and Rating */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-[var(--font-terminal)] text-[#1a1915] text-base leading-snug group-hover:text-[#00a86b] transition-colors duration-200 line-clamp-2 flex-1">
                      {item.title}
                    </h3>
                    {item.rating && <StarDisplay value={item.rating} size="sm" />}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="text-[#9a958f] font-[var(--font-mono)] uppercase tracking-wider">
                      {item.type}
                    </span>
                    <span className="text-black/10">·</span>
                    <span className="text-[#9a958f] font-[var(--font-mono)]">{item.year}</span>
                  </div>

                  {/* Progress and Tags */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className={`${statusBadgeClass(item.status)} font-[var(--font-mono)] text-[10px] uppercase tracking-wide`}>
                      {statusLabels[item.status]}
                    </span>
                    {progress && (
                      <span className="inline-flex items-center gap-1.5 text-[#00a86b] font-[var(--font-mono)] bg-[#00a86b]/8 px-2 py-1 rounded-sm border border-[#00a86b]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b] animate-pulse" />
                        {formatProgress(progress)}
                      </span>
                    )}
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="term-badge text-[10px] px-2 py-1 border border-black/5 text-[#6b6560] hover:border-[#00a86b]/40 hover:text-[#00a86b] transition-colors duration-150"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Enhanced Empty State */
        <div
          className="term-card text-center py-16 px-6 fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#ebe8e1] border border-[#d4cfc5] flex items-center justify-center">
            <span className="text-4xl font-[var(--font-terminal)] text-[#9a958f]">
              [DATABASE]
            </span>
          </div>

          {/* Message */}
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-xl mb-3 tracking-wide">
            DATABASE EMPTY
          </h2>
          <p className="text-[#6b6560] text-sm mb-8 max-w-xs mx-auto leading-relaxed">
            No records found in memory. Start tracking your reading and viewing journey.
          </p>

          {/* CTA Button */}
          <Link
            href="/new"
            className="term-btn inline-flex items-center gap-2 px-6 py-3 cursor-pointer hover:shadow-lg transition-shadow duration-200"
          >
            <span className="text-lg">+</span>
            <span>ADD FIRST RECORD</span>
          </Link>
        </div>
      )}

      {/* Enhanced Footer */}
      <footer className="mt-14 pt-6 border-t border-[#d4cfc5]">
        <div className="grid grid-cols-2 gap-4 text-xs text-[#9a958f] font-[var(--font-mono)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]" />
            <span>MEMORY: {records.length} records</span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b] animate-pulse" />
            <span>SYSTEM: READY</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-[10px] text-[#d4cfc5] font-[var(--font-mono)]">
            ENJOYRECORD v1.0 · DIGITAL TERMINAL
          </p>
        </div>
      </footer>
    </div>
  );
}
