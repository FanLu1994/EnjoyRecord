import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <Card className="rounded-2xl border-black/5 bg-white/70 shadow-sm transition hover:shadow-md">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-[#8a837b]">{label}</p>
        <p className="mt-2 text-2xl font-display font-semibold text-[#1c1a17]">{value}</p>
        {note && <p className="mt-2 text-xs text-[#6f6a63]">{note}</p>}
      </CardContent>
    </Card>
  );
}
