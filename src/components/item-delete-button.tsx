"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/components/admin-auth-provider";

export default function ItemDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const adminFetch = useAdminFetch();
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
      const response = await adminFetch(`/api/records/${id}`, {
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
    <>
      {confirming ? (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs font-mono text-red-600 bg-red-100 border-2 border-red-400 px-2 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          {isDeleting ? "..." : "CONFIRM?"}
        </button>
      ) : (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs font-mono text-red-600 hover:text-red-800 bg-red-50 border border-red-200 px-2 py-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          [DEL]
        </button>
      )}
      {error && (
        <div className="mt-2 text-xs text-red-600">{error}</div>
      )}
    </>
  );
}
