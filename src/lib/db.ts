import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  MediaType,
  Progress,
  ProgressUnit,
  RecordItem,
  RecordStatus,
} from "./data";
import { seedRecords } from "./data";

let dbInstance: DatabaseSync | null = null;

const dbPath = path.join(process.cwd(), "data", "enjoyrecord.db");

const ensureDatabase = () => {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec("PRAGMA journal_mode = WAL");

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      original_title TEXT,
      year INTEGER NOT NULL,
      summary TEXT NOT NULL,
      cover_url TEXT,
      cover_tone TEXT NOT NULL,
      cover_accent TEXT NOT NULL,
      status TEXT NOT NULL,
      rating REAL,
      tags TEXT NOT NULL,
      notes TEXT,
      progress_current INTEGER,
      progress_total INTEGER,
      progress_unit TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      history TEXT NOT NULL
    );
  `);

  const columns = dbInstance
    .prepare("PRAGMA table_info(records)")
    .all() as { name: string }[];
  const columnNames = new Set(columns.map((column) => column.name));
  if (!columnNames.has("cover_url")) {
    dbInstance.exec("ALTER TABLE records ADD COLUMN cover_url TEXT");
  }

  // Migrate old date-only timestamps to full ISO timestamps
  const needsMigration = dbInstance
    .prepare("SELECT COUNT(1) as count FROM records WHERE LENGTH(created_at) = 10")
    .get() as { count: number };
  if (needsMigration.count > 0) {
    const rows = dbInstance
      .prepare("SELECT id, created_at, updated_at, started_at, completed_at FROM records")
      .all() as { id: string; created_at: string; updated_at: string; started_at?: string; completed_at?: string }[];

    dbInstance.exec("BEGIN");
    try {
      const migrate = dbInstance.prepare(`
        UPDATE records SET
          created_at = @created_at,
          updated_at = @updated_at,
          started_at = @started_at,
          completed_at = @completed_at
        WHERE id = @id
      `);

      for (const row of rows) {
        // Convert YYYY-MM-DD to YYYY-MM-DDT00:00:00.000Z
        const toTimestamp = (date: string | null | undefined) => {
          if (!date) return null;
          return date.length === 10 ? `${date}T00:00:00.000Z` : date;
        };

        migrate.run({
          id: row.id,
          created_at: toTimestamp(row.created_at),
          updated_at: toTimestamp(row.updated_at),
          started_at: toTimestamp(row.started_at),
          completed_at: toTimestamp(row.completed_at),
        });
      }
      dbInstance.exec("COMMIT");
    } catch (error) {
      dbInstance.exec("ROLLBACK");
      throw error;
    }
  }

  const count = dbInstance
    .prepare("SELECT COUNT(1) as count FROM records")
    .get() as { count: number };

  if (count.count === 0 && seedRecords.length > 0) {
    const insert = dbInstance.prepare(`
      INSERT INTO records (
        id,
        type,
        title,
        original_title,
        year,
        summary,
        cover_url,
        cover_tone,
        cover_accent,
        status,
        rating,
        tags,
        notes,
        progress_current,
        progress_total,
        progress_unit,
        started_at,
        completed_at,
        created_at,
        updated_at,
        history
      )
      VALUES (
        @id,
        @type,
        @title,
        @original_title,
        @year,
        @summary,
        @cover_url,
        @cover_tone,
        @cover_accent,
        @status,
        @rating,
        @tags,
        @notes,
        @progress_current,
        @progress_total,
        @progress_unit,
        @started_at,
        @completed_at,
        @created_at,
        @updated_at,
        @history
      )
    `);

    dbInstance.exec("BEGIN");
    try {
      seedRecords.forEach((record) => {
        insert.run(serializeRecord(record));
      });
      dbInstance.exec("COMMIT");
    } catch (error) {
      dbInstance.exec("ROLLBACK");
      throw error;
    }
  }

  return dbInstance;
};

const serializeRecord = (record: RecordItem) => ({
  id: record.id,
  type: record.type,
  title: record.title,
  original_title: record.originalTitle ?? null,
  year: record.year,
  summary: record.summary,
  cover_url: record.coverUrl ?? null,
  cover_tone: record.cover.tone,
  cover_accent: record.cover.accent,
  status: record.status,
  rating: record.rating ?? null,
  tags: JSON.stringify(record.tags),
  notes: record.notes ?? null,
  progress_current: record.progress?.current ?? null,
  progress_total: record.progress?.total ?? null,
  progress_unit: record.progress?.unit ?? null,
  started_at: record.startedAt ?? null,
  completed_at: record.completedAt ?? null,
  created_at: record.createdAt,
  updated_at: record.updatedAt,
  history: JSON.stringify(record.history),
});

const deserializeRecord = (row: Record<string, unknown>): RecordItem => ({
  id: row.id as string,
  type: row.type as RecordItem["type"],
  title: row.title as string,
  originalTitle: (row.original_title as string) || undefined,
  year: Number(row.year),
  summary: row.summary as string,
  coverUrl: (row.cover_url as string) || undefined,
  cover: {
    tone: row.cover_tone as string,
    accent: row.cover_accent as string,
  },
  status: row.status as RecordItem["status"],
  rating: row.rating === null ? undefined : Number(row.rating),
  tags: JSON.parse(String(row.tags)) as string[],
  notes: (row.notes as string) || undefined,
  progress:
    row.progress_current === null
      ? undefined
      : {
          current: Number(row.progress_current),
          total:
            row.progress_total === null ? undefined : Number(row.progress_total),
          unit: row.progress_unit as ProgressUnit,
        },
  startedAt: (row.started_at as string) || undefined,
  completedAt: (row.completed_at as string) || undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  history: JSON.parse(String(row.history)) as RecordItem["history"],
});

export const getAllRecords = () => {
  const db = ensureDatabase();
  const rows = db
    .prepare("SELECT * FROM records ORDER BY updated_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(deserializeRecord);
};

export const getRecordById = (id: string) => {
  const db = ensureDatabase();
  const row = db
    .prepare("SELECT * FROM records WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? deserializeRecord(row) : undefined;
};

const defaultCover = (type: MediaType) => {
  switch (type) {
    case "book":
      return { tone: "#f5efe8", accent: "#b48a63" };
    case "film":
      return { tone: "#f3ece6", accent: "#b36b54" };
    case "series":
      return { tone: "#eef0f2", accent: "#6b7a86" };
    case "game":
      return { tone: "#f0ede7", accent: "#7f6d56" };
    default:
      return { tone: "#f2eee8", accent: "#9b8f82" };
  }
};

export const createRecord = (input: {
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  summary: string;
  coverUrl?: string;
  status?: RecordStatus;
  rating?: number;
  tags?: string[];
  notes?: string;
  progress?: Progress;
}) => {
  const now = new Date().toISOString();
  const cover = defaultCover(input.type);
  const record: RecordItem = {
    id: crypto.randomUUID(),
    type: input.type,
    title: input.title,
    originalTitle: input.originalTitle,
    year: input.year ?? new Date().getFullYear(),
    summary: input.summary,
    coverUrl: input.coverUrl,
    cover,
    status: input.status ?? "planned",
    rating: input.rating,
    tags: input.tags ?? [],
    notes: input.notes,
    progress: input.progress,
    startedAt: undefined,
    completedAt: undefined,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        date: now,
        status: input.status ?? "planned",
        progress: input.progress,
        note: input.notes,
      },
    ],
  };

  const db = ensureDatabase();
  const insert = db.prepare(`
    INSERT INTO records (
      id,
      type,
      title,
      original_title,
      year,
      summary,
      cover_url,
      cover_tone,
      cover_accent,
      status,
      rating,
      tags,
      notes,
      progress_current,
      progress_total,
      progress_unit,
      started_at,
      completed_at,
      created_at,
      updated_at,
      history
    )
    VALUES (
      @id,
      @type,
      @title,
      @original_title,
      @year,
      @summary,
      @cover_url,
      @cover_tone,
      @cover_accent,
      @status,
      @rating,
      @tags,
      @notes,
      @progress_current,
      @progress_total,
      @progress_unit,
      @started_at,
      @completed_at,
      @created_at,
      @updated_at,
      @history
    )
  `);

  insert.run(serializeRecord(record));
  return record;
};

export const updateRecord = (
  id: string,
  input: {
    status?: RecordStatus;
    rating?: number | null;
    notes?: string;
    progress?: Progress;
    historyNote?: string;
  }
) => {
  const existing = getRecordById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const nextStatus = input.status ?? existing.status;
  const nextProgress = input.progress ?? existing.progress;
  const nextRating =
    input.rating === undefined
      ? existing.rating
      : input.rating === null
        ? undefined
        : input.rating;
  const nextNotes = input.notes ?? existing.notes;
  const nextStartedAt = existing.startedAt;
  const nextCompletedAt = existing.completedAt;

  const shouldAppendHistory =
    input.status !== undefined || input.progress !== undefined || input.historyNote !== undefined;
  const nextHistory = shouldAppendHistory
    ? [
        ...existing.history,
        {
          date: now,
          status: nextStatus,
          progress: input.progress ?? existing.progress,
          note: input.historyNote,
        },
      ]
    : existing.history;

  const updated: RecordItem = {
    ...existing,
    status: nextStatus,
    rating: nextRating,
    notes: nextNotes,
    progress: nextProgress,
    startedAt: nextStartedAt,
    completedAt: nextCompletedAt,
    updatedAt: now,
    history: nextHistory,
  };

  const db = ensureDatabase();
  const update = db.prepare(`
    UPDATE records SET
      status = @status,
      rating = @rating,
      notes = @notes,
      progress_current = @progress_current,
      progress_total = @progress_total,
      progress_unit = @progress_unit,
      started_at = @started_at,
      completed_at = @completed_at,
      updated_at = @updated_at,
      history = @history
    WHERE id = @id
  `);

  const payload = {
    id: updated.id,
    status: updated.status,
    rating: updated.rating ?? null,
    notes: updated.notes ?? null,
    progress_current: updated.progress?.current ?? null,
    progress_total: updated.progress?.total ?? null,
    progress_unit: updated.progress?.unit ?? null,
    started_at: updated.startedAt ?? null,
    completed_at: updated.completedAt ?? null,
    updated_at: updated.updatedAt,
    history: JSON.stringify(updated.history),
  };

  update.run(payload);
  return updated;
};

export const deleteRecord = (id: string) => {
  const db = ensureDatabase();
  const result = db
    .prepare("DELETE FROM records WHERE id = ?")
    .run(id) as { changes?: number };
  return (result.changes ?? 0) > 0;
};
