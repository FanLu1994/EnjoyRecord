export type MediaType = "book" | "film" | "series" | "game";
export type RecordStatus = "planned" | "in_progress" | "completed" | "paused";
export type ProgressUnit = "pages" | "chapters" | "episodes" | "hours";

export interface Progress {
  current: number;
  total?: number;
  unit: ProgressUnit;
}

export interface RecordHistory {
  date: string;
  status: RecordStatus;
  progress?: Progress;
  note?: string;
}

export interface RecordItem {
  id: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  year: number;
  summary: string;
  coverUrl?: string;
  cover: {
    tone: string;
    accent: string;
  };
  status: RecordStatus;
  rating?: number;
  tags: string[];
  notes?: string;
  progress?: Progress;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  history: RecordHistory[];
}

export const seedRecords: RecordItem[] = [];
