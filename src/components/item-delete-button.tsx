"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ItemDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    setError(null);
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/records/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed.");
      }
      router.push("/library");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div>
      {confirming ? (
        <div className="space-y-2 rounded-xl border border-[#c53030]/30 bg-[#fff5f5] p-3 text-xs text-[#7d1a1a]">
          <div>Delete this record? This cannot be undone.</div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="term-btn flex-1 border-[#c53030] text-[#c53030] hover:text-white hover:bg-[#c53030] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isDeleting ? "..." : "Confirm delete"}</span>
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isDeleting}
              className="term-btn flex-1 border-[#6b6560] text-[#6b6560] hover:text-white hover:bg-[#6b6560] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="term-btn w-full border-[#c53030] text-[#c53030] hover:text-white hover:bg-[#c53030] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isDeleting ? "..." : "Delete record"}</span>
        </button>
      )}
      {error ? (
        <div className="mt-2 text-xs text-[#c53030]">{error}</div>
      ) : null}
    </div>
  );
}
