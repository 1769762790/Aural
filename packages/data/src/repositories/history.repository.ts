import { nowIso } from "../helpers";
import type { AuralDatabase } from "../store";
import { mapTrackRow } from "./mappers";
import type { Track, TrackId, TrackRow } from "./types";

export const recordPlay = (database: AuralDatabase, trackId: TrackId, sourceType = "library", sourceId = "library"): void => {
  const playedAt = nowIso();
  database.transaction(() => {
    database.db.prepare("INSERT INTO play_history (track_id, played_at, source_type, source_id) VALUES (?, ?, ?, ?)").run(trackId, playedAt, sourceType, sourceId);
    database.db.prepare("UPDATE tracks SET play_count = play_count + 1, last_played_at = ? WHERE id = ?").run(playedAt, trackId);
  });
};

export const getRecentHistory = (database: AuralDatabase, limit = 20): Track[] =>
  (
    database.db.prepare(
      `
      SELECT t.*
      FROM (
        SELECT track_id, MAX(played_at) AS played_at
        FROM play_history
        GROUP BY track_id
        ORDER BY played_at DESC
        LIMIT ?
      ) AS recent
      JOIN tracks t ON t.id = recent.track_id
      ORDER BY recent.played_at DESC
    `
    ).all(limit) as unknown as TrackRow[]
  ).map(mapTrackRow);

export const clearPlayHistory = (database: AuralDatabase): number =>
  database.transaction(() => {
    const removed = Number(database.db.prepare("DELETE FROM play_history").run().changes);
    database.db.prepare("UPDATE tracks SET last_played_at = NULL").run();
    return removed;
  });

export const prunePlayHistory = (database: AuralDatabase, maxItems: number, clearPlayHistoryFn: () => number): number => {
  const normalizedLimit = Math.max(0, Math.floor(maxItems));
  if (normalizedLimit === 0) {
    return clearPlayHistoryFn();
  }

  return database.transaction(() => {
    const beforeCount = Number((database.db.prepare("SELECT COUNT(*) AS count FROM play_history").get() as { count: number } | undefined)?.count ?? 0);

    database.db.prepare(
      `
      DELETE FROM play_history
      WHERE track_id NOT IN (
        SELECT track_id
        FROM (
          SELECT track_id, MAX(played_at) AS played_at
          FROM play_history
          GROUP BY track_id
          ORDER BY played_at DESC
          LIMIT ?
        )
      )
    `
    ).run(normalizedLimit);

    database.db.prepare(
      `
      UPDATE tracks
      SET last_played_at = NULL
      WHERE id NOT IN (SELECT DISTINCT track_id FROM play_history)
    `
    ).run();

    const afterCount = Number((database.db.prepare("SELECT COUNT(*) AS count FROM play_history").get() as { count: number } | undefined)?.count ?? 0);
    return Math.max(0, beforeCount - afterCount);
  });
};
