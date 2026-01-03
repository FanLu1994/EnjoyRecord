import type { Progress } from "@/lib/data";
import { progressPercent } from "@/lib/format";
import { Progress as ProgressUI } from "@/components/ui/progress";

export default function ProgressBar({ progress }: { progress?: Progress }) {
  const percent = progressPercent(progress);
  return (
    <ProgressUI
      value={percent ?? 0}
      className="h-2 bg-[#efe8e0]"
      indicatorClassName="bg-[#1c1a17]"
    />
  );
}
