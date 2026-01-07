import StatCard from "@/components/stat-card";
import { getAllRecords } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function StatsPage() {
  const recordItems = getAllRecords();
  const completed = recordItems.filter((item) => item.status === "completed");
  const inProgress = recordItems.filter((item) => item.status === "in_progress");

  // 按类型统计完成数
  const completedByType = completed.reduce(
    (acc, item) => {
      acc[item.type] += 1;
      return acc;
    },
    { book: 0, film: 0, series: 0, game: 0 }
  );

  const avgRating =
    completed.reduce((sum, item) => sum + (item.rating || 0), 0) /
    (completed.length || 1);

  const typeCounts = recordItems.reduce(
    (acc, item) => {
      acc[item.type] += 1;
      return acc;
    },
    { book: 0, film: 0, series: 0, game: 0 }
  );

  const ratingBuckets = [
    { label: "9+", count: 0 },
    { label: "7.5-8.9", count: 0 },
    { label: "6-7.4", count: 0 },
    { label: "<6", count: 0 },
  ];

  completed.forEach((item) => {
    const rating = item.rating || 0;
    if (rating >= 9) ratingBuckets[0].count += 1;
    else if (rating >= 7.5) ratingBuckets[1].count += 1;
    else if (rating >= 6) ratingBuckets[2].count += 1;
    else ratingBuckets[3].count += 1;
  });

  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setMonth(now.getMonth() - (5 - index));
    const label = `${date.getMonth() + 1}月`;
    const count = completed.filter((item) => {
      if (!item.completedAt) return false;
      const completedDate = new Date(item.completedAt);
      return (
        completedDate.getFullYear() === date.getFullYear() &&
        completedDate.getMonth() === date.getMonth()
      );
    }).length;
    return { label, count };
  });

  const maxMonthly = Math.max(...monthly.map((item) => item.count), 1);
  const maxRating = Math.max(...ratingBuckets.map((item) => item.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">统计回顾</h1>
        <p className="text-sm text-[#6f6a63]">
          查看完成数量、类型分布与评分走势。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="阅读完成" value={`${completedByType.book} 本`} />
        <StatCard label="观影完成" value={`${completedByType.film + completedByType.series} 部`} />
        <StatCard label="进行中" value={`${inProgress.length} 项`} />
        <StatCard label="平均评分" value={avgRating.toFixed(1)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wide text-[#8a837b]">
              月度完成数
            </div>
            <div className="mt-5 grid gap-3">
              {monthly.map((item) => (
                <div key={item.label} className="flex items-center gap-4 text-sm">
                  <span className="w-12 text-[#6f6a63]">{item.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-[#efe8e0]">
                    <div
                      className="h-2 rounded-full bg-[#1c1a17]"
                      style={{
                        width: `${(item.count / maxMonthly) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[#1c1a17]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wide text-[#8a837b]">
              类型占比
            </div>
            <div className="mt-5 space-y-3 text-sm text-[#6f6a63]">
              {[
                { label: "书籍", count: typeCounts.book },
                { label: "电影", count: typeCounts.film },
                { label: "剧集", count: typeCounts.series },
                { label: "游戏", count: typeCounts.game },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="w-12">{item.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-[#efe8e0]">
                    <div
                      className="h-2 rounded-full bg-[#1c1a17]"
                      style={{
                        width: `${(item.count / recordItems.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[#1c1a17]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
        <CardContent className="p-6">
          <div className="text-xs uppercase tracking-wide text-[#8a837b]">
            评分分布
          </div>
          <div className="mt-5 grid gap-3">
            {ratingBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-4 text-sm">
                <span className="w-16 text-[#6f6a63]">{bucket.label}</span>
                <div className="h-2 flex-1 rounded-full bg-[#efe8e0]">
                  <div
                    className="h-2 rounded-full bg-[#1c1a17]"
                    style={{
                      width: `${(bucket.count / maxRating) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-[#1c1a17]">
                  {bucket.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
