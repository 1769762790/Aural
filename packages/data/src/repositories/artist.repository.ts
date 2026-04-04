import { ORDER_BY_ARTIST, direction, mapTrackRow } from "./mappers";
import type { AuralDatabase } from "../store";
import { nowIso } from "../helpers";
import type { ArtistDetail, ArtistListQuery, ArtistSummary, ArtistSummaryRow, TrackRow } from "./types";

export const refreshLibrarySummaries = (database: AuralDatabase, updatedAt = nowIso()): void => {
  database.transaction(() => {
    database.db.prepare("DELETE FROM artist_summaries").run();
    database.db.prepare("DELETE FROM album_summaries").run();

    database.db.prepare(
      `
      INSERT INTO artist_summaries (id, name, normalized_name, track_count, album_count, cover_path, updated_at)
      WITH normalized_tracks AS (
        SELECT
          id,
          COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist') AS artist_name,
          LOWER(COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist')) AS artist_key,
          COALESCE(NULLIF(TRIM(album), ''), 'Unknown Album') AS album_title,
          cover_path,
          added_at,
          last_played_at
        FROM tracks
        WHERE status <> 'invalid'
      )
      SELECT
        artist_key AS id,
        artist_name AS name,
        artist_key AS normalized_name,
        COUNT(*) AS track_count,
        COUNT(DISTINCT album_title) AS album_count,
        (
          SELECT nt2.cover_path
          FROM normalized_tracks nt2
          WHERE nt2.artist_key = nt.artist_key
            AND nt2.cover_path IS NOT NULL
            AND nt2.cover_path <> ''
          ORDER BY COALESCE(nt2.last_played_at, nt2.added_at) DESC, nt2.id DESC
          LIMIT 1
        ) AS cover_path,
        @updated_at AS updated_at
      FROM normalized_tracks nt
      GROUP BY artist_key, artist_name
    `
    ).run({ updated_at: updatedAt });

    database.db.prepare(
      `
      INSERT INTO album_summaries (id, title, artist, year, track_count, cover_path, added_at, updated_at)
      WITH normalized_tracks AS (
        SELECT
          id,
          COALESCE(NULLIF(TRIM(album), ''), 'Unknown Album') AS album_title,
          LOWER(COALESCE(NULLIF(TRIM(album), ''), 'Unknown Album')) AS album_key,
          COALESCE(NULLIF(TRIM(album_artist), ''), NULLIF(TRIM(artist), ''), 'Unknown Artist') AS album_artist_name,
          LOWER(COALESCE(NULLIF(TRIM(album_artist), ''), NULLIF(TRIM(artist), ''), 'Unknown Artist')) AS album_artist_key,
          year,
          cover_path,
          added_at,
          last_played_at
        FROM tracks
        WHERE status <> 'invalid'
      )
      SELECT
        album_key || '::' || album_artist_key || '::' || COALESCE(CAST(year AS TEXT), 'na') AS id,
        album_title AS title,
        album_artist_name AS artist,
        year,
        COUNT(*) AS track_count,
        (
          SELECT nt2.cover_path
          FROM normalized_tracks nt2
          WHERE nt2.album_key = nt.album_key
            AND nt2.album_artist_key = nt.album_artist_key
            AND (nt2.year IS nt.year OR (nt2.year IS NULL AND nt.year IS NULL))
            AND nt2.cover_path IS NOT NULL
            AND nt2.cover_path <> ''
          ORDER BY COALESCE(nt2.last_played_at, nt2.added_at) DESC, nt2.id DESC
          LIMIT 1
        ) AS cover_path,
        MAX(added_at) AS added_at,
        @updated_at AS updated_at
      FROM normalized_tracks nt
      GROUP BY album_key, album_title, album_artist_key, album_artist_name, year
    `
    ).run({ updated_at: updatedAt });
  });
};

export const ensureLibrarySummaries = (database: AuralDatabase, refreshLibrarySummariesFn: () => void): void => {
  const summaryCount = database.db.prepare("SELECT COUNT(*) AS count FROM artist_summaries").get() as { count?: number } | undefined;
  const trackCount = database.db.prepare("SELECT COUNT(*) AS count FROM tracks").get() as { count?: number } | undefined;

  if (Number(summaryCount?.count ?? 0) === 0 && Number(trackCount?.count ?? 0) > 0) {
    refreshLibrarySummariesFn();
  }
};

export const getArtistDetail = (database: AuralDatabase, artistId: string): ArtistDetail | null => {
  const summary = database.db.prepare(
    `
    SELECT id, name, normalized_name, track_count, album_count, cover_path, NULL AS cover_url
    FROM artist_summaries
    WHERE id = ?
  `
  ).get(artistId) as ArtistSummaryRow | undefined;

  if (!summary) {
    return null;
  }

  const tracks = (
    database.db.prepare(
      `
      SELECT *
      FROM tracks
      WHERE LOWER(COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist')) = ?
        AND status <> 'invalid'
      ORDER BY added_at DESC
    `
    ).all(artistId) as unknown as TrackRow[]
  ).map(mapTrackRow);

  return {
    id: summary.id,
    name: summary.name,
    normalizedName: summary.normalized_name,
    trackCount: Number(summary.track_count),
    albumCount: Number(summary.album_count),
    coverPath: summary.cover_path ?? null,
    coverUrl: summary.cover_url ?? null,
    tracks,
    totalDurationSeconds: tracks.reduce((sum, track) => sum + track.duration, 0)
  };
};

export const listArtists = (database: AuralDatabase, query: ArtistListQuery = {}): ArtistSummary[] => {
  const sortBy = query.sortBy ?? "name";
  const orderBy = ORDER_BY_ARTIST[sortBy];
  return (
    database.db.prepare(
      `
      SELECT
        id,
        name,
        normalized_name,
        track_count,
        album_count,
        cover_path,
        NULL AS cover_url
      FROM artist_summaries
      ORDER BY ${orderBy} ${direction(query.sortDirection)}
    `
    ).all() as unknown as ArtistSummaryRow[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    trackCount: Number(row.track_count),
    albumCount: Number(row.album_count),
    coverPath: row.cover_path ?? null,
    coverUrl: row.cover_url ?? null
  }));
};
