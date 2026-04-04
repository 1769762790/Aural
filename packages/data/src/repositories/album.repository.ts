import type { AuralDatabase } from "../store";
import { ORDER_BY_ALBUM, direction, mapTrackRow } from "./mappers";
import type { AlbumDetail, AlbumListQuery, AlbumSummary, AlbumSummaryRow, TrackRow } from "./types";

export const getAlbumDetail = (database: AuralDatabase, albumId: string): AlbumDetail | null => {
  const summary = database.db.prepare(
    `
    SELECT id, title, artist, year, track_count, cover_path, added_at
    FROM album_summaries
    WHERE id = ?
  `
  ).get(albumId) as AlbumSummaryRow | undefined;

  if (!summary) {
    return null;
  }

  const tracks = (
    database.db.prepare(
      `
      SELECT *
      FROM tracks
      WHERE
        (LOWER(COALESCE(NULLIF(TRIM(album), ''), 'Unknown Album')) || '::' ||
         LOWER(COALESCE(NULLIF(TRIM(album_artist), ''), NULLIF(TRIM(artist), ''), 'Unknown Artist')) || '::' ||
         COALESCE(CAST(year AS TEXT), 'na')) = ?
        AND status <> 'invalid'
      ORDER BY added_at DESC
    `
    ).all(albumId) as unknown as TrackRow[]
  ).map(mapTrackRow);

  return {
    id: summary.id,
    title: summary.title,
    artist: summary.artist,
    year: summary.year,
    trackCount: Number(summary.track_count),
    coverPath: summary.cover_path ?? null,
    tracks,
    totalDurationSeconds: tracks.reduce((sum, track) => sum + track.duration, 0)
  };
};

export const listAlbums = (database: AuralDatabase, query: AlbumListQuery = {}): AlbumSummary[] => {
  const sortBy = query.sortBy ?? "title";
  const orderBy = ORDER_BY_ALBUM[sortBy];
  return (
    database.db.prepare(
      `
      SELECT
        id,
        title,
        artist,
        year,
        track_count,
        cover_path,
        added_at
      FROM album_summaries
      ORDER BY ${orderBy} ${direction(query.sortDirection)}
    `
    ).all() as unknown as AlbumSummaryRow[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    trackCount: Number(row.track_count),
    coverPath: row.cover_path ?? null
  }));
};
