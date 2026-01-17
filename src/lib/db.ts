import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";
import type {
  MediaType,
  Progress,
  ProgressUnit,
  RecordItem,
  RecordStatus,
} from "./data";
import { seedRecords } from "./data";

type DatabaseType = "sqlite" | "pgsql";

const getDatabaseType = (): DatabaseType => {
  const dbType = process.env.DATABASE_TYPE as DatabaseType;
  return dbType === "pgsql" ? "pgsql" : "sqlite";
};

interface DatabaseConnection {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  queryOne(sql: string, params?: unknown[]): Promise<unknown | undefined>;
  exec(sql: string): Promise<void>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class SQLiteConnection implements DatabaseConnection {
  constructor(private db: DatabaseSync) {}

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    const stmt = this.db.prepare(sql);
    if (params && params.length > 0) {
      // Use a type assertion to handle the SQLite parameter binding
      const result = stmt.all(...params as any[]);
      return result as unknown[];
    }
    return stmt.all() as unknown[];
  }

  async queryOne(sql: string, params?: unknown[]): Promise<unknown | undefined> {
    const stmt = this.db.prepare(sql);
    if (params && params.length > 0) {
      return stmt.get(...params as any[]) as unknown;
    }
    return stmt.get() as unknown;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async begin(): Promise<void> {
    this.db.exec("BEGIN");
  }

  async commit(): Promise<void> {
    this.db.exec("COMMIT");
  }

  async rollback(): Promise<void> {
    this.db.exec("ROLLBACK");
  }
}

class PgSQLConnection implements DatabaseConnection {
  private client: Client;
  private inTransaction = false;

  constructor(url: string) {
    this.client = new Client({ connectionString: url });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    const res = await this.client.query(sql, params);
    return res.rows;
  }

  async queryOne(sql: string, params?: unknown[]): Promise<unknown | undefined> {
    const res = await this.client.query(sql, params);
    return res.rows[0];
  }

  async exec(sql: string): Promise<void> {
    await this.client.query(sql);
  }

  async begin(): Promise<void> {
    await this.client.query("BEGIN");
    this.inTransaction = true;
  }

  async commit(): Promise<void> {
    await this.client.query("COMMIT");
    this.inTransaction = false;
  }

  async rollback(): Promise<void> {
    await this.client.query("ROLLBACK");
    this.inTransaction = false;
  }

  async close(): Promise<void> {
    if (this.inTransaction) {
      await this.rollback();
    }
    await this.client.end();
  }
}

let dbInstance: DatabaseConnection | null = null;

const getCreateTableSQL = () => `
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
`;

const ensureDatabase = async (): Promise<DatabaseConnection> => {
  if (dbInstance) return dbInstance;

  const dbType = getDatabaseType();

  if (dbType === "pgsql") {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is required when DATABASE_TYPE=pgsql");
    }

    const pgDb = new PgSQLConnection(dbUrl);
    await pgDb.connect();

    pgDb.exec(getCreateTableSQL());

    const countResult = (await pgDb.queryOne(
      "SELECT COUNT(*) as count FROM records"
    )) as { count: string };

    if (countResult.count === "0" && seedRecords.length > 0) {
      await pgDb.begin();
      try {
        for (const record of seedRecords) {
          const data = serializeRecord(record);
          await pgDb.query(`
            INSERT INTO records (
              id, type, title, original_title, year, summary, cover_url,
              cover_tone, cover_accent, status, rating, tags, notes,
              progress_current, progress_total, progress_unit, started_at,
              completed_at, created_at, updated_at, history
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18, $19, $20, $21
            )
          `, [
            data.id, data.type, data.title, data.original_title, data.year,
            data.summary, data.cover_url, data.cover_tone, data.cover_accent,
            data.status, data.rating, data.tags, data.notes, data.progress_current,
            data.progress_total, data.progress_unit, data.started_at,
            data.completed_at, data.created_at, data.updated_at, data.history
          ]);
        }
        await pgDb.commit();
      } catch (error) {
        await pgDb.rollback();
        throw error;
      }
    }

    dbInstance = pgDb;
    return dbInstance;
  } else {
    const dbPath = path.join(process.cwd(), "data", "enjoyrecord.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec("PRAGMA journal_mode = WAL");

    sqliteDb.exec(getCreateTableSQL());

    const columns = sqliteDb
      .prepare("PRAGMA table_info(records)")
      .all() as { name: string }[];
    const columnNames = new Set(columns.map((column) => column.name));
    if (!columnNames.has("cover_url")) {
      sqliteDb.exec("ALTER TABLE records ADD COLUMN cover_url TEXT");
    }

    const needsMigration = sqliteDb
      .prepare("SELECT COUNT(1) as count FROM records WHERE LENGTH(created_at) = 10")
      .get() as { count: number };
    if (needsMigration.count > 0) {
      const rows = sqliteDb
        .prepare("SELECT id, created_at, updated_at, started_at, completed_at FROM records")
        .all() as { id: string; created_at: string; updated_at: string; started_at?: string; completed_at?: string }[];

      sqliteDb.exec("BEGIN");
      try {
        const migrate = sqliteDb.prepare(`
          UPDATE records SET
            created_at = @created_at,
            updated_at = @updated_at,
            started_at = @started_at,
            completed_at = @completed_at
          WHERE id = @id
        `);

        for (const row of rows) {
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
        sqliteDb.exec("COMMIT");
      } catch (error) {
        sqliteDb.exec("ROLLBACK");
        throw error;
      }
    }

    const count = sqliteDb
      .prepare("SELECT COUNT(1) as count FROM records")
      .get() as { count: number };

    if (count.count === 0 && seedRecords.length > 0) {
      const insert = sqliteDb.prepare(`
        INSERT INTO records (
          id, type, title, original_title, year, summary, cover_url,
          cover_tone, cover_accent, status, rating, tags, notes,
          progress_current, progress_total, progress_unit, started_at,
          completed_at, created_at, updated_at, history
        )
        VALUES (
          @id, @type, @title, @original_title, @year, @summary, @cover_url,
          @cover_tone, @cover_accent, @status, @rating, @tags, @notes,
          @progress_current, @progress_total, @progress_unit, @started_at,
          @completed_at, @created_at, @updated_at, @history
        )
      `);

      sqliteDb.exec("BEGIN");
      try {
        seedRecords.forEach((record) => {
          insert.run(serializeRecord(record));
        });
        sqliteDb.exec("COMMIT");
      } catch (error) {
        sqliteDb.exec("ROLLBACK");
        throw error;
      }
    }

    dbInstance = new SQLiteConnection(sqliteDb);
    return dbInstance;
  }
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

export const getAllRecords = async () => {
  const db = await ensureDatabase();
  const dbType = getDatabaseType();

  if (dbType === "pgsql") {
    const rows = await db.query(
      "SELECT * FROM records ORDER BY updated_at DESC"
    ) as Record<string, unknown>[];
    return rows.map(deserializeRecord);
  } else {
    const rows = await db.query(
      "SELECT * FROM records ORDER BY updated_at DESC"
    ) as Record<string, unknown>[];
    return rows.map(deserializeRecord);
  }
};

export const getRecordById = async (id: string) => {
  const db = await ensureDatabase();
  const dbType = getDatabaseType();

  if (dbType === "pgsql") {
    const row = await db.queryOne(
      "SELECT * FROM records WHERE id = $1",
      [id]
    ) as Record<string, unknown> | undefined;
    return row ? deserializeRecord(row) : undefined;
  } else {
    const row = await db.queryOne(
      "SELECT * FROM records WHERE id = ?",
      [id]
    ) as Record<string, unknown> | undefined;
    return row ? deserializeRecord(row) : undefined;
  }
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

export const createRecord = async (input: {
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

  const db = await ensureDatabase();
  const dbType = getDatabaseType();
  const data = serializeRecord(record);

  if (dbType === "pgsql") {
    await db.query(`
      INSERT INTO records (
        id, type, title, original_title, year, summary, cover_url,
        cover_tone, cover_accent, status, rating, tags, notes,
        progress_current, progress_total, progress_unit, started_at,
        completed_at, created_at, updated_at, history
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21
      )
    `, [
      data.id, data.type, data.title, data.original_title, data.year,
      data.summary, data.cover_url, data.cover_tone, data.cover_accent,
      data.status, data.rating, data.tags, data.notes, data.progress_current,
      data.progress_total, data.progress_unit, data.started_at,
      data.completed_at, data.created_at, data.updated_at, data.history
    ]);
  } else {
    await db.query(`
      INSERT INTO records (
        id, type, title, original_title, year, summary, cover_url,
        cover_tone, cover_accent, status, rating, tags, notes,
        progress_current, progress_total, progress_unit, started_at,
        completed_at, created_at, updated_at, history
      )
      VALUES (
        @id, @type, @title, @original_title, @year, @summary, @cover_url,
        @cover_tone, @cover_accent, @status, @rating, @tags, @notes,
        @progress_current, @progress_total, @progress_unit, @started_at,
        @completed_at, @created_at, @updated_at, @history
      )
    `, [
      data.id, data.type, data.title, data.original_title, data.year,
      data.summary, data.cover_url, data.cover_tone, data.cover_accent,
      data.status, data.rating, data.tags, data.notes, data.progress_current,
      data.progress_total, data.progress_unit, data.started_at,
      data.completed_at, data.created_at, data.updated_at, data.history
    ]);
  }

  return record;
};

export const updateRecord = async (
  id: string,
  input: {
    status?: RecordStatus;
    rating?: number | null;
    notes?: string | null;
    progress?: Progress;
    historyNote?: string;
  }
) => {
  const existing = await getRecordById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const nextStatus = input.status ?? existing.status;
  const nextProgress = input.progress ?? existing.progress;
  const nextRating = input.rating === undefined ? existing.rating : input.rating === null ? undefined : input.rating;
  const nextNotes = input.notes === undefined ? existing.notes : input.notes === null ? undefined : input.notes;

  const nextStartedAt =
    input.status === "in_progress" && !existing.startedAt
      ? now
      : existing.startedAt;

  const nextCompletedAt =
    input.status === "completed" && !existing.completedAt
      ? now
      : input.status !== "completed" && existing.completedAt
        ? undefined
        : existing.completedAt;

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

  const db = await ensureDatabase();
  const dbType = getDatabaseType();

  if (dbType === "pgsql") {
    await db.query(`
      UPDATE records SET
        status = $1, rating = $2, notes = $3, progress_current = $4,
        progress_total = $5, progress_unit = $6, started_at = $7,
        completed_at = $8, updated_at = $9, history = $10
      WHERE id = $11
    `, [
      updated.status,
      updated.rating ?? null,
      updated.notes ?? null,
      updated.progress?.current ?? null,
      updated.progress?.total ?? null,
      updated.progress?.unit ?? null,
      updated.startedAt ?? null,
      updated.completedAt ?? null,
      updated.updatedAt,
      JSON.stringify(updated.history),
      id,
    ]);
  } else {
    await db.query(`
      UPDATE records SET
        status = @status, rating = @rating, notes = @notes,
        progress_current = @progress_current, progress_total = @progress_total,
        progress_unit = @progress_unit, started_at = @started_at,
        completed_at = @completed_at, updated_at = @updated_at,
        history = @history
      WHERE id = @id
    `, [
      updated.status,
      updated.rating ?? null,
      updated.notes ?? null,
      updated.progress?.current ?? null,
      updated.progress?.total ?? null,
      updated.progress?.unit ?? null,
      updated.startedAt ?? null,
      updated.completedAt ?? null,
      updated.updatedAt,
      JSON.stringify(updated.history),
      id,
    ]);
  }

  return updated;
};

export const deleteRecord = async (id: string) => {
  const db = await ensureDatabase();
  const dbType = getDatabaseType();

  if (dbType === "pgsql") {
    const result = await db.query(
      "DELETE FROM records WHERE id = $1",
      [id]
    ) as { rowCount?: number }[];
    return ((result[0]?.rowCount ?? 0) as number) > 0;
  } else {
    const result = await db.query(
      "DELETE FROM records WHERE id = ?",
      [id]
    ) as { changes?: number }[];
    return ((result[0]?.changes ?? 0) as number) > 0;
  }
};
