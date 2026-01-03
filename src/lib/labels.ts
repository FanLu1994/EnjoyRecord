import type { MediaType, RecordStatus } from "./data";

export const typeLabels: Record<MediaType, string> = {
  book: "书籍",
  film: "电影",
  series: "剧集",
  game: "游戏",
};

export const statusLabels: Record<RecordStatus, string> = {
  planned: "想",
  in_progress: "进行中",
  completed: "完成",
  paused: "搁置",
};

export const typeBadgeClass = (type: MediaType) => {
  switch (type) {
    case "book":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "film":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "series":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "game":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export const statusBadgeClass = (status: RecordStatus) => {
  switch (status) {
    case "planned":
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
    case "in_progress":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "paused":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};
