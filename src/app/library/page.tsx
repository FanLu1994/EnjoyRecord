"use client";

import { useEffect, useMemo, useState } from "react";
import RecordCard from "@/components/record-card";
import RecordRow from "@/components/record-row";
import type { RecordItem, MediaType, RecordStatus } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { statusLabels, typeLabels } from "@/lib/labels";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

const typeOptions: Array<MediaType | "all"> = [
  "all",
  "book",
  "film",
  "series",
  "game",
];

const statusOptions: Array<RecordStatus | "all"> = [
  "all",
  "planned",
  "in_progress",
  "completed",
  "paused",
];

const sortOptions = [
  { value: "recent", label: "最近更新" },
  { value: "completed", label: "完成时间" },
  { value: "rating", label: "评分" },
];

export default function LibraryPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [view, setView] = useState<"card" | "list" | "timeline">("card");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "all">("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const loadRecords = async () => {
      const response = await fetch("/api/records");
      const data = (await response.json()) as { records: RecordItem[] };
      setRecords(data.records);
    };
    loadRecords();
  }, []);

  const filtered = useMemo(() => {
    let items = [...records];
    if (query.trim()) {
      const term = query.trim().toLowerCase();
      items = items.filter((item) =>
        [item.title, item.originalTitle, item.summary, ...item.tags]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(term))
      );
    }
    if (typeFilter !== "all") {
      items = items.filter((item) => item.type === typeFilter);
    }
    if (statusFilter !== "all") {
      items = items.filter((item) => item.status === statusFilter);
    }
    if (sortBy === "completed") {
      items.sort((a, b) =>
        (b.completedAt || "").localeCompare(a.completedAt || "")
      );
    } else if (sortBy === "rating") {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return items;
  }, [query, typeFilter, statusFilter, sortBy, records]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">组织与检索</h1>
          <p className="text-sm text-[#6f6a63]">
            通过关键词与过滤条件快速定位条目。
          </p>
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
          <TabsList className="rounded-full bg-white/80 p-1">
            <TabsTrigger value="card" className="rounded-full">
              卡片
            </TabsTrigger>
            <TabsTrigger value="list" className="rounded-full">
              列表
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-full">
              时间线
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="rounded-3xl border-black/5 bg-white/80 shadow-sm">
        <CardContent className="grid gap-4 p-6 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[#8a837b]">
              关键词
            </label>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入名称、标签或备注"
              className="rounded-2xl border-black/10 bg-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[#8a837b]">
              类型
            </label>
            <ToggleGroup
              type="single"
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter((value as MediaType | "all") || "all")
              }
              className="flex flex-wrap justify-start gap-2"
            >
              {typeOptions.map((type) => (
                <ToggleGroupItem
                  key={type}
                  value={type}
                  className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#6f6a63] data-[state=on]:border-[#1c1a17] data-[state=on]:bg-[#1c1a17] data-[state=on]:text-white"
                >
                  {type === "all" ? "全部" : typeLabels[type]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[#8a837b]">
              状态
            </label>
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter((value as RecordStatus | "all") || "all")
              }
              className="flex flex-wrap justify-start gap-2"
            >
              {statusOptions.map((status) => (
                <ToggleGroupItem
                  key={status}
                  value={status}
                  className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#6f6a63] data-[state=on]:border-[#1c1a17] data-[state=on]:bg-[#1c1a17] data-[state=on]:text-white"
                >
                  {status === "all" ? "全部" : statusLabels[status]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[#8a837b]">
              排序
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-2xl border-black/10 bg-white text-sm">
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {view === "card" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <RecordCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {view === "list" ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <RecordRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {view === "timeline" ? (
        <div className="space-y-6">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="rounded-3xl border-black/5 bg-white/80 shadow-sm"
            >
              <CardContent className="flex gap-4 p-5">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[#1c1a17]" />
                  <div className="h-full w-px bg-black/10" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-[#8a837b]">
                    {formatDate(item.updatedAt)}
                  </div>
                  <div className="text-lg font-semibold text-[#1c1a17]">
                    {item.title}
                  </div>
                  <p className="text-sm text-[#6f6a63]">{item.summary}</p>
                  <div className="text-xs text-[#6f6a63]">
                    最新状态：{statusLabels[item.status]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
