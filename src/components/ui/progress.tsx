import * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  indicatorClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  indicatorClassName?: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn("h-full w-full bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </div>
  );
}

export { Progress };
