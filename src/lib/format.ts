import type { Progress, RecordItem } from "./data";

export const formatDate = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatRating = (rating?: number) => {
  if (!rating) return "未评分";
  return rating.toFixed(1);
};

export const formatProgress = (progress?: Progress) => {
  if (!progress) return "未记录";
  const unitLabel =
    progress.unit === "pages"
      ? "页"
      : progress.unit === "chapters"
        ? "章"
        : progress.unit === "episodes"
          ? "集"
          : "小时";
  if (progress.total) {
    return `${progress.current}/${progress.total}${unitLabel}`;
  }
  return `${progress.current}${unitLabel}`;
};

export const progressPercent = (progress?: Progress) => {
  if (!progress || !progress.total) return undefined;
  if (progress.total === 0) return undefined;
  return Math.min(100, Math.round((progress.current / progress.total) * 100));
};

export const resolveProgress = (
  record: Pick<RecordItem, "progress" | "history">
): Progress | undefined => {
  if (record.progress) return record.progress;
  for (let i = record.history.length - 1; i >= 0; i -= 1) {
    const entry = record.history[i];
    if (entry.progress) return entry.progress;
  }
  return undefined;
};
