import { notFound } from "next/navigation";
import ItemProgressUpdate from "@/components/item-progress-update";
import { getRecordById } from "@/lib/db";
import { formatDate, formatProgress } from "@/lib/format";
import {
  statusBadgeClass,
  statusLabels,
  typeBadgeClass,
  typeLabels,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getRecordById(id);
  if (!item) return notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <section>
        <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge
                variant="secondary"
                className={`rounded-full ${typeBadgeClass(item.type)}`}
              >
                {typeLabels[item.type]}
              </Badge>
              <Badge
                variant="secondary"
                className={`rounded-full ${statusBadgeClass(item.status)}`}
              >
                {statusLabels[item.status]}
              </Badge>
              <span className="text-[#8a837b]">{item.year}</span>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-6">
              <div
                className="h-56 w-40 overflow-hidden rounded-3xl border border-black/10 shadow-inner mx-auto sm:mx-0"
                style={{
                  background: item.coverUrl
                    ? `url(${item.coverUrl}) center / cover no-repeat`
                    : `linear-gradient(135deg, ${item.cover.tone}, ${item.cover.accent})`,
                }}
              />
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-semibold">{item.title}</h1>
                  {item.originalTitle ? (
                    <p className="text-sm text-[#8a837b]">
                      {item.originalTitle}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-[#5d564f]">{item.summary}</p>
                {item.rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#d48806]">★</span>
                    <span className="font-medium">{item.rating}/10</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="rounded-full border border-black/10 text-[#6f6a63]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <ItemProgressUpdate
          id={item.id}
          status={item.status}
          rating={item.rating}
          notes={item.notes}
          showDeleteButton={true}
        />
      </section>

      {item.history.length > 0 && (
        <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wide text-[#8a837b]">
              HISTORY
            </div>
            <div className="mt-4 space-y-4">
              {item.history.map((entry, index) => (
                <Card
                  key={`${entry.date}-${index}`}
                  className="rounded-2xl border-black/5 bg-white"
                >
                  <CardContent className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm text-[#6f6a63]">
                    <Badge className="rounded-full px-3 py-1 text-xs">
                      {formatDate(entry.date)}
                    </Badge>
                    <span>Status: {statusLabels[entry.status]}</span>
                    {entry.progress ? (
                      <span>Progress: {formatProgress(entry.progress)}</span>
                    ) : null}
                    {entry.note ? <span>Note: {entry.note}</span> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
