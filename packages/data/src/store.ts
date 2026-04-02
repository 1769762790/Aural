import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";

export interface AuralDatabaseOptions {
  filePath?: string;
  memory?: boolean;
}

export class AuralDatabase {
  readonly db: DatabaseSync;

  constructor(options: AuralDatabaseOptions = {}) {
    const filePath = options.memory ? ":memory:" : options.filePath ?? ":memory:";
    if (filePath !== ":memory:") {
      mkdirSync(dirname(filePath), { recursive: true });
    }

    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA foreign_keys = ON;");
    if (filePath !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL;");
    }
  }

  migrate() {
    const row = this.db.prepare("PRAGMA user_version").get() as { user_version?: number } | undefined;
    const currentVersion = Number(row?.user_version ?? 0);
    this.db.exec(SCHEMA_SQL);

    if (!this.hasColumn("tracks", "embedded_lyrics")) {
      this.db.exec("ALTER TABLE tracks ADD COLUMN embedded_lyrics TEXT;");
    }

    if (this.hasTable("artist_summaries") && !this.hasColumn("artist_summaries", "cover_path")) {
      this.db.exec("ALTER TABLE artist_summaries ADD COLUMN cover_path TEXT;");
    }

    if (this.hasTable("album_summaries") && !this.hasColumn("album_summaries", "added_at")) {
      this.db.exec("ALTER TABLE album_summaries ADD COLUMN added_at TEXT NOT NULL DEFAULT '';");
    }

    if (currentVersion < 4) {
      this.db.exec(`
        INSERT OR IGNORE INTO playable_items (
          id, source, provider, provider_item_id, title, artist, album, album_artist,
          year, genre, duration, format, bitrate, sample_rate, cover_path, cover_url,
          lyric_path, path, directory, play_count, added_at, last_played_at, status,
          file_hash, lyrics_availability, downloaded_path, local_track_id, search_blob
        )
        SELECT
          t.id,
          'local',
          NULL,
          NULL,
          t.title,
          t.artist,
          t.album,
          t.album_artist,
          t.year,
          t.genre,
          t.duration,
          t.format,
          t.bitrate,
          t.sample_rate,
          t.cover_path,
          NULL,
          t.lyric_path,
          t.path,
          t.directory,
          t.play_count,
          t.added_at,
          t.last_played_at,
          t.status,
          t.file_hash,
          CASE WHEN t.lyric_path IS NOT NULL THEN 'file' ELSE 'none' END,
          NULL,
          t.id,
          t.search_blob
        FROM tracks t;

        INSERT OR IGNORE INTO favorite_items (playable_item_id, created_at)
        SELECT id, COALESCE(last_played_at, added_at, CURRENT_TIMESTAMP)
        FROM tracks
        WHERE is_favorite = 1;

        INSERT OR IGNORE INTO playlist_entries (playlist_id, playable_item_id, sort_index, added_at)
        SELECT playlist_id, track_id, sort_index, added_at
        FROM playlist_items;

        INSERT OR IGNORE INTO play_history_items (playable_item_id, played_at, source_type, source_id)
        SELECT track_id, played_at, source_type, source_id
        FROM play_history;
      `);
    }

    if (currentVersion < SCHEMA_VERSION) {
      this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    }
  }

  close() {
    this.db.close();
  }

  transaction<T>(action: () => T): T {
    this.db.exec("BEGIN");
    try {
      const result = action();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private hasColumn(tableName: string, columnName: string) {
    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
    return rows.some((row) => row.name === columnName);
  }

  private hasTable(tableName: string) {
    const row = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName) as { name?: string } | undefined;
    return Boolean(row?.name);
  }
}

export const openAuralDatabase = (options: AuralDatabaseOptions = {}) => {
  const database = new AuralDatabase(options);
  database.migrate();
  return database;
};
