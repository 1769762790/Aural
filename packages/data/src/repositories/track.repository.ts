import { buildSearchBlob, normalizePath, nowIso, pathKey } from "../helpers";
import type { AuralDatabase } from "../store";
import { DEFAULT_TRACK_SORT, ORDER_BY_TRACK, createTrackIdFromPath, direction, mapTrackRow } from "./mappers";
import type {
  OverviewRecord,
  Track,
  TrackId,
  TrackListQuery,
  TrackMediaRecord,
  TrackRecordInput,
  TrackRow
} from "./types";

interface TrackRepositoryDeps {
  refreshLibrarySummaries: () => void;
  findTrackById: (id: TrackId | string) => Track | null;
  findTrackByPath: (path: string) => Track | null;
  listTracks: (query?: TrackListQuery) => Track[];
}

export const upsertTrack = (database: AuralDatabase, input: TrackRecordInput, deps: TrackRepositoryDeps): Track => {
  const path = normalizePath(input.path);
  const directory = normalizePath(input.directory ?? path.split("\\").slice(0, -1).join("\\"));
  const addedAt = input.addedAt ?? nowIso();
  const searchBlob = buildSearchBlob(input.title, input.artist, input.album, input.albumArtist, path, directory);
  const existingById = input.id ? deps.findTrackById(input.id) : null;
  const existingByPath = deps.findTrackByPath(path);
  const recordId = input.id ?? existingById?.id ?? existingByPath?.id ?? createTrackIdFromPath(path, input.fileHash ?? null, input.title);
  const payload = {
    id: recordId,
    path,
    path_key: pathKey(path),
    directory,
    directory_key: pathKey(directory),
    file_hash: input.fileHash ?? null,
    title: input.title,
    artist: input.artist,
    album: input.album,
    album_artist: input.albumArtist ?? input.artist,
    year: input.year ?? null,
    genre: input.genre ?? null,
    duration: input.duration ?? 0,
    format: input.format,
    bitrate: input.bitrate ?? null,
    sample_rate: input.sampleRate ?? null,
    cover_path: input.coverPath ?? null,
    lyric_path: input.lyricPath ?? null,
    embedded_lyrics: input.embeddedLyrics ?? null,
    is_favorite: input.isFavorite ? 1 : 0,
    play_count: input.playCount ?? 0,
    added_at: addedAt,
    last_played_at: input.lastPlayedAt ?? null,
    status: input.status ?? "ready",
    search_blob: searchBlob
  };

  if (existingById) {
    database.db.prepare(`
      UPDATE tracks SET
        path = @path,
        path_key = @path_key,
        directory = @directory,
        directory_key = @directory_key,
        file_hash = @file_hash,
        title = @title,
        artist = @artist,
        album = @album,
        album_artist = @album_artist,
        year = @year,
        genre = @genre,
        duration = @duration,
        format = @format,
        bitrate = @bitrate,
        sample_rate = @sample_rate,
        cover_path = @cover_path,
        lyric_path = @lyric_path,
        embedded_lyrics = @embedded_lyrics,
        is_favorite = @is_favorite,
        play_count = @play_count,
        added_at = @added_at,
        last_played_at = @last_played_at,
        status = @status,
        search_blob = @search_blob
      WHERE id = @id
    `).run(payload);
    return deps.findTrackById(recordId)!;
  }

  if (existingByPath) {
    database.db.prepare(`
      UPDATE tracks SET
        id = @id,
        directory = @directory,
        directory_key = @directory_key,
        file_hash = @file_hash,
        title = @title,
        artist = @artist,
        album = @album,
        album_artist = @album_artist,
        year = @year,
        genre = @genre,
        duration = @duration,
        format = @format,
        bitrate = @bitrate,
        sample_rate = @sample_rate,
        cover_path = @cover_path,
        lyric_path = @lyric_path,
        embedded_lyrics = @embedded_lyrics,
        is_favorite = @is_favorite,
        play_count = @play_count,
        added_at = @added_at,
        last_played_at = @last_played_at,
        status = @status,
        search_blob = @search_blob
      WHERE path_key = @path_key
    `).run(payload);
    return deps.findTrackByPath(path)!;
  }

  database.db.prepare(`
    INSERT INTO tracks (
      id, path, path_key, directory, directory_key, file_hash, title, artist, album, album_artist,
      year, genre, duration, format, bitrate, sample_rate, cover_path, lyric_path, embedded_lyrics, is_favorite,
      play_count, added_at, last_played_at, status, search_blob
    ) VALUES (
      @id, @path, @path_key, @directory, @directory_key, @file_hash, @title, @artist, @album, @album_artist,
      @year, @genre, @duration, @format, @bitrate, @sample_rate, @cover_path, @lyric_path, @embedded_lyrics, @is_favorite,
      @play_count, @added_at, @last_played_at, @status, @search_blob
    )
    ON CONFLICT(path_key) DO UPDATE SET
      id = excluded.id,
      path = excluded.path,
      directory = excluded.directory,
      directory_key = excluded.directory_key,
      file_hash = excluded.file_hash,
      title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      album_artist = excluded.album_artist,
      year = excluded.year,
      genre = excluded.genre,
      duration = excluded.duration,
      format = excluded.format,
      bitrate = excluded.bitrate,
      sample_rate = excluded.sample_rate,
      cover_path = excluded.cover_path,
      lyric_path = excluded.lyric_path,
      embedded_lyrics = excluded.embedded_lyrics,
      is_favorite = excluded.is_favorite,
      play_count = excluded.play_count,
      last_played_at = excluded.last_played_at,
      status = excluded.status,
      search_blob = excluded.search_blob
  `).run(payload);

  return deps.findTrackByPath(path) ?? deps.findTrackById(recordId)!;
};

export const upsertTracks = (database: AuralDatabase, inputs: TrackRecordInput[], upsertTrackFn: (input: TrackRecordInput) => Track) =>
  database.transaction(() => inputs.map((input) => upsertTrackFn(input)));

export const findTrackById = (database: AuralDatabase, id: TrackId | string): Track | null => {
  const row = database.db.prepare("SELECT * FROM tracks WHERE id = ?").get(id) as TrackRow | undefined;
  return row ? mapTrackRow(row) : null;
};

export const findTrackByPath = (database: AuralDatabase, path: string): Track | null => {
  const row = database.db.prepare("SELECT * FROM tracks WHERE path_key = ?").get(pathKey(path)) as TrackRow | undefined;
  return row ? mapTrackRow(row) : null;
};

export const findTracksByHash = (database: AuralDatabase, fileHash: string): Track[] =>
  (database.db.prepare("SELECT * FROM tracks WHERE file_hash = ?").all(fileHash) as unknown as TrackRow[]).map(mapTrackRow);

export const findTrackMediaById = (database: AuralDatabase, id: TrackId | string): TrackMediaRecord | null => {
  const row = database.db
    .prepare("SELECT id, cover_path, lyric_path, embedded_lyrics FROM tracks WHERE id = ?")
    .get(id) as { id: string; cover_path: string | null; lyric_path: string | null; embedded_lyrics: string | null } | undefined;

  if (!row) {
    return null;
  }

  return {
    trackId: row.id as TrackId,
    coverPath: row.cover_path,
    lyricPath: row.lyric_path,
    embeddedLyrics: row.embedded_lyrics
  };
};

export const markTracksMissing = (database: AuralDatabase, trackIds: TrackId[]): number => {
  if (trackIds.length === 0) {
    return 0;
  }

  const placeholders = trackIds.map(() => "?").join(", ");
  return database.db.prepare(`UPDATE tracks SET status = 'missing' WHERE id IN (${placeholders})`).run(...trackIds).changes as number;
};

export const deleteTrackById = (database: AuralDatabase, trackId: TrackId, deps: Pick<TrackRepositoryDeps, "findTrackById" | "refreshLibrarySummaries">) => {
  const track = deps.findTrackById(trackId);
  if (!track) {
    return null;
  }

  database.db.prepare("DELETE FROM tracks WHERE id = ?").run(trackId);
  deps.refreshLibrarySummaries();
  return track;
};

export const listTracks = (database: AuralDatabase, query: TrackListQuery = {}): Track[] => {
  const where: string[] = [];
  const params: Record<string, string | number | null> = {};
  if (query.search) {
    where.push("search_blob LIKE @search");
    params.search = `%${buildSearchBlob(query.search)}%`;
  }
  if (query.favoritesOnly) {
    where.push("is_favorite = 1");
  }
  if (query.status) {
    where.push("status = @status");
    params.status = query.status;
  }

  const sortBy = query.sortBy ?? DEFAULT_TRACK_SORT;
  const orderBy = ORDER_BY_TRACK[sortBy];
  const sql = `
    SELECT * FROM tracks t
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${orderBy} ${direction(query.sortDirection)}
    ${query.limit ? "LIMIT @limit" : ""}
  `;
  if (query.limit) {
    params.limit = query.limit;
  }

  return (database.db.prepare(sql).all(params) as unknown as TrackRow[]).map(mapTrackRow);
};

export const getOverview = (database: AuralDatabase): OverviewRecord => {
  const row = database.db.prepare(
    `
    SELECT
      COUNT(*) AS tracks,
      COUNT(DISTINCT album) AS albums,
      COUNT(DISTINCT artist) AS artists,
      (SELECT COUNT(*) FROM playlists) AS playlists,
      COALESCE(SUM(duration), 0) AS totalDurationSeconds
    FROM tracks
    WHERE status = 'ready'
  `
  ).get() as OverviewRecord | undefined;

  return {
    tracks: Number(row?.tracks ?? 0),
    albums: Number(row?.albums ?? 0),
    artists: Number(row?.artists ?? 0),
    playlists: Number(row?.playlists ?? 0),
    totalDurationSeconds: Number(row?.totalDurationSeconds ?? 0)
  };
};

export const toggleFavorite = (database: AuralDatabase, trackId: TrackId, findTrackByIdFn: (id: TrackId) => Track | null): boolean => {
  const track = findTrackByIdFn(trackId);
  if (!track) {
    return false;
  }

  const next = track.isFavorite ? 0 : 1;
  database.db.prepare("UPDATE tracks SET is_favorite = ? WHERE id = ?").run(next, trackId);
  return Boolean(next);
};

export const getFavorites = (listTracksFn: (query?: TrackListQuery) => Track[]) =>
  listTracksFn({ favoritesOnly: true, sortBy: "addedAt", sortDirection: "desc" });

export const searchTracks = (listTracksFn: (query?: TrackListQuery) => Track[], term: string, limit = 50): Track[] =>
  listTracksFn({
    search: term,
    limit,
    sortBy: "addedAt",
    sortDirection: "desc"
  });
