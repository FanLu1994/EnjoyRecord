"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecordStatus } from "@/lib/data";
import { statusLabels } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import StarRating from "@/components/star-rating";
import { useAdminFetch } from "@/components/admin-auth-provider";

const STATUS_OPTIONS: RecordStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "paused",
];

export default function ItemProgressUpdate({
  id,
  status,
  rating,
  notes,
}: {
  id: string;
  status: RecordStatus;
  rating?: number;
  notes?: string;
}) {
  const router = useRouter();
  const adminFetch = useAdminFetch();
  const [nextStatus, setNextStatus] = useState<RecordStatus>(status);
  const [ratingValue, setRatingValue] = useState<number | null>(
    rating === undefined ? null : rating
  );
  const [note, setNote] = useState("");
  const [review, setReview] = useState(notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const ratingChanged = ratingValue !== (rating ?? null);
    const reviewChanged = review.trim() !== (notes ?? "");
    if (nextStatus === status && !note.trim() && !ratingChanged && !reviewChanged) {
      setError("No changes to update.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await adminFetch(`/api/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          rating: ratingValue === null ? null : ratingValue,
          note: note.trim() || undefined,
          notes: review.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Update failed.");
      }

      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
      <CardContent className="p-6">
        <div className="text-xs uppercase tracking-wide text-[#8a837b]">
          Update progress
        </div>
        <div className="mt-4 grid gap-4 text-sm text-[#5d564f]">
          <div className="grid gap-2">
            <label className="text-xs text-[#8a837b]">Status</label>
            <select
              value={nextStatus}
              onChange={(event) =>
                setNextStatus(event.target.value as RecordStatus)
              }
              className="term-select"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-[#8a837b]">Rating</label>
            <div className="flex items-center justify-between gap-3">
              <StarRating
                value={ratingValue ?? 0}
                onChange={(value) => setRatingValue(value)}
                disabled={isSaving}
                displayValue={ratingValue}
              />
              {ratingValue !== null ? (
                <button
                  type="button"
                  onClick={() => setRatingValue(null)}
                  className="text-xs text-[#6b6560] hover:text-[#1c1a17]"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-[#8a837b]">Note</label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note for history"
              className="term-input"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-[#8a837b]">评价</label>
            <textarea
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="最多 200 字"
              maxLength={200}
              rows={3}
              className="term-input resize-none"
            />
            <div className="text-[10px] text-[#9a958f] font-[var(--font-mono)]">
              {review.length}/200
            </div>
          </div>
        </div>
        {error ? (
          <div className="mt-3 text-xs text-[#c53030]">{error}</div>
        ) : null}
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="term-btn mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isSaving ? "..." : "Save update"}</span>
        </button>
      </CardContent>
    </Card>
  );
}
