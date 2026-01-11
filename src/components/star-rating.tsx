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
  const [inputValue, setInputValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const safeValue = Math.min(10, Math.max(0, value));
  const shownValue = displayValue === undefined ? safeValue : displayValue;
  const percent = (safeValue / 10) * 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 10) {
      onChange(num);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < 0 || num > 10) {
      setInputValue(safeValue > 0 ? safeValue.toString() : "");
    } else {
      setInputValue(num.toString());
    }
  };

  const displayedInput = isFocused ? inputValue : (inputValue || (safeValue > 0 ? safeValue.toString() : ""));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Stars display */}
      <div className="relative inline-flex items-center">
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
      </div>

      {/* Value input */}
      <div className="relative">
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={displayedInput}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder="0-10"
          className="w-16 px-2 py-1 text-center text-sm font-medium border border-[#d4cfc5] rounded-lg bg-white text-[#1c1a17] placeholder:text-[#9a958f] focus:outline-none focus:ring-2 focus:ring-[#f5a524] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="absolute right-[-1.25rem] top-1/2 -translate-y-1/2 text-xs text-[#9a958f]">
          /10
        </span>
      </div>
    </div>
  );
}
