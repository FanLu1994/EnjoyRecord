"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const Star = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    className={cn("h-4 w-4", className)}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M10 1.5l2.3 4.7 5.2.8-3.8 3.7.9 5.2L10 13.6 5.4 15.9l.9-5.2L2.5 7l5.2-.8L10 1.5z"
    />
  </svg>
);

export function StarDisplay({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const safeValue = Math.min(10, Math.max(0, value));
  const percent = (safeValue / 10) * 100;
  const sizeClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="relative inline-flex items-center">
      <div className="flex gap-0.5 text-[#d4cfc5]">
        {Array.from({ length: 5 }).map((_, index) => (
          <svg key={`star-bg-${index}`} viewBox="0 0 20 20" className={sizeClasses} aria-hidden="true">
            <path fill="currentColor" d="M10 1.5l2.3 4.7 5.2.8-3.8 3.7.9 5.2L10 13.6 5.4 15.9l.9-5.2L2.5 7l5.2-.8L10 1.5z" />
          </svg>
        ))}
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}>
        <div className="flex gap-0.5 text-[#f5a524]">
          {Array.from({ length: 5 }).map((_, index) => (
            <svg key={`star-fill-${index}`} viewBox="0 0 20 20" className={sizeClasses} aria-hidden="true">
              <path fill="currentColor" d="M10 1.5l2.3 4.7 5.2.8-3.8 3.7.9 5.2L10 13.6 5.4 15.9l.9-5.2L2.5 7l5.2-.8L10 1.5z" />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StarRating({
  value,
  onChange,
  disabled = false,
  className,
  displayValue,
  showValue = true,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  displayValue?: number | null;
  showValue?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const safeValue = Math.min(10, Math.max(0, value));
  const displayRating = hoverValue ?? safeValue;
  const percent = (displayRating / 10) * 100;
  const shownValue =
    displayValue === undefined ? displayRating : displayValue;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const rating = Math.round(percentage * 10 * 10) / 10;
    const clampedRating = Math.min(10, Math.max(0, rating));
    setHoverValue(clampedRating);
    onChange(clampedRating);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      <div
        className="relative inline-flex items-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex gap-1 text-[#d4cfc5]">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={`star-bg-${index}`} />
        ))}
        </div>
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        >
          <div className="flex gap-1 text-[#f5a524]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={`star-fill-${index}`} />
          ))}
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={safeValue}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
          aria-label="Rating"
          className={cn(
            "absolute inset-0 h-6 w-full cursor-pointer opacity-0",
            disabled && "cursor-not-allowed"
          )}
        />
      </div>
      {showValue ? (
        <span className="text-xs text-[#6b6560]">
          {shownValue === null ? "—" : shownValue.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
