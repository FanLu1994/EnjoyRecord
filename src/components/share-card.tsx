"use client"

import { useRef, useEffect, useState, forwardRef } from "react"
import { RecordItem } from "@/lib/data"
import { typeLabels, typeBadgeClass, statusBadgeClass, statusLabels } from "@/lib/labels"

interface ShareCardProps {
  item: RecordItem
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ item }, ref) => {
  const internalRef = useRef<HTMLDivElement>(null)
  const cardRef = (ref as React.RefObject<HTMLDivElement>) || internalRef
  const [coverDataUrl, setCoverDataUrl] = useState<string | undefined>()

  useEffect(() => {
    async function fetchCoverBase64() {
      if (!item.coverUrl) return

      try {
        const response = await fetch(`/api/image-base64?url=${encodeURIComponent(item.coverUrl)}`)
        if (response.ok) {
          const data = await response.json()
          setCoverDataUrl(data.dataUrl)
        }
      } catch (error) {
        console.error("Failed to fetch cover base64:", error)
      }
    }

    fetchCoverBase64()
  }, [item.coverUrl])

  return (
    <div
      ref={cardRef}
      className="w-[450px] rounded-3xl border border-black/5 bg-white/80 p-6"
    >
      {/* Header - Type and Status Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeBadgeClass(item.type)}`}>
          {typeLabels[item.type]}
        </span>
        <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}>
          {statusLabels[item.status]}
        </span>
        <span className="text-xs text-[#8a837b]">{item.year}</span>
        <span className="ml-auto text-xs text-[#8a837b]">EnjoyRecord</span>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Cover */}
        {coverDataUrl ? (
          <img
            src={coverDataUrl}
            alt={item.title}
            className="h-56 w-40 flex-shrink-0 rounded-3xl border border-black/10 object-cover"
          />
        ) : (
          <div
            className="h-56 w-40 flex-shrink-0 rounded-3xl border border-black/10"
            style={{
              background: `linear-gradient(135deg, ${item.cover.tone}, ${item.cover.accent})`,
            }}
          />
        )}

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold leading-tight">{item.title}</h2>
            {item.originalTitle && (
              <p className="text-sm text-[#8a837b] mt-0.5">{item.originalTitle}</p>
            )}
          </div>
          <p className="text-sm text-[#5d564f] leading-relaxed line-clamp-3">
            {item.summary}
          </p>
          {item.rating && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#d48806]">★</span>
              <span className="font-medium">{item.rating}/10</span>
            </div>
          )}
        </div>
      </div>

      {/* Review/Notes */}
      {item.notes && (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
          <div className="text-xs text-[#8a837b] mb-1.5">评价</div>
          <p className="text-sm text-[#3d3834] leading-relaxed whitespace-pre-wrap">
            {item.notes}
          </p>
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center justify-center rounded-full border border-black/10 px-2 py-0.5 text-xs text-[#6f6a63]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
        <div className="text-xs text-[#8a837b]">
          记录于 {new Date(item.createdAt).toLocaleDateString("zh-CN")}
        </div>
      </div>
    </div>
  )
})

ShareCard.displayName = "ShareCard"
