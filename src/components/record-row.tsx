import Link from "next/link";
import type { RecordItem } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_LABELS = { book: "书籍", film: "电影", series: "剧集", game: "游戏" } as const;
const STATUS_LABELS = {
  completed: "完成",
  in_progress: "进行中",
  planned: "想",
  paused: "搁置",
} as const;

const formatRating = (rating: number | undefined) => (rating ? `*${rating}` : "-");

export default function RecordRow({ item }: { item: RecordItem }) {
  return (
    <Link href={`/items/${item.id}`} className="block">
      <Card className="rounded-xl border-black/5 bg-white/70 shadow-sm transition-all hover:shadow-md">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div
            className="shrink-0 overflow-hidden rounded-lg shadow-inner"
            style={{
              width: 48,
              height: 64,
              background: item.coverUrl
                ? `url(${item.coverUrl}) center/cover no-repeat`
                : `linear-gradient(145deg, ${item.cover.tone}, ${item.cover.accent})`,
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full bg-[#f7f2ec] px-2.5 py-0.5 font-medium">
                {TYPE_LABELS[item.type]}
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-[#e8e4df] px-2.5 py-0.5 font-medium">
                {STATUS_LABELS[item.status]}
              </Badge>
              <span className="text-[#8a837b]">{item.year}</span>
            </div>
            <h3 className="mt-1.5 truncate font-display text-base font-semibold text-[#1c1a17]">
              {item.title}
            </h3>
            <p className="truncate text-sm text-[#6f6a63]">{item.summary}</p>
          </div>

          <div className="flex gap-6 text-xs sm:gap-8">
            <div>
              <span className="text-[#8a837b]">状态</span>
              <p className="mt-0.5 font-medium text-[#1c1a17]">{STATUS_LABELS[item.status]}</p>
            </div>
            <div>
              <span className="text-[#8a837b]">评分</span>
              <p className="mt-0.5 font-medium text-[#1c1a17]">{formatRating(item.rating)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
