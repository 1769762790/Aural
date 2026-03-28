import type {
  AlbumDetail,
  AlbumSummary,
  ArtistDetail,
  ArtistSummary,
  FolderSummary,
  PlaylistSummary,
  SearchScope,
  SettingKey,
  SettingValue,
  SortDirection,
  Track,
  TrackStatus
} from "@aural/domain/src/entities";
import type { PlaylistId, TrackId } from "@aural/domain/src/ids";
import { createPlaylistId, createTrackId } from "@aural/domain/src/ids";
import { buildSearchBlob, nowIso, normalizePath, pathKey, toBoolean } from "./helpers";
import { AuralDatabase } from "./store";

export interface TrackRecordInput {
  id?: TrackId;
  path: string;
  directory?: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number | null;
  genre?: string | null;
  duration?: number;
  format: string;
  bitrate?: number | null;
  sampleRate?: number | null;
  coverPath?: string | null;
  lyricPath?: string | null;
  embeddedLyrics?: string | null;
  isFavorite?: boolean;
  playCount?: number;
  addedAt?: string;
  lastPlayedAt?: string | null;
  status?: TrackStatus;
  fileHash?: string | null;
}

export interface TrackListQuery {
  search?: string;
  sortBy?: "title" | "artist" | "album" | "addedAt" | "lastPlayedAt" | "duration";
  sortDirection?: SortDirection;
  limit?: number;
  favoritesOnly?: boolean;
  status?: TrackStatus;
}

export interface AlbumListQuery {
  sortBy?: "title" | "artist" | "year" | "addedAt";
  sortDirection?: SortDirection;
}

export interface ArtistListQuery {
  sortBy?: "name" | "trackCount" | "albumCount";
  sortDirection?: SortDirection;
}

export interface FolderListQuery {
  sortBy?: "path" | "trackCount";
  sortDirection?: SortDirection;
}

export interface SearchTrackQuery extends TrackListQuery {
  scope?: SearchScope;
}

export interface CreatePlaylistInput {
  name: string;
}

export interface PlaylistMutationInput {
  playlistId: PlaylistId;
  trackIds: TrackId[];
}

export interface ScanFolderRecord {
  folder_id: number;
  path: string;
  path_key: string;
  created_at: string;
  last_scanned_at: string | null;
  is_active: boolean;
}

export interface SettingRecord {
  key: SettingKey;
  value: SettingValue;
  updatedAt: string;
}

export interface TrackMediaRecord {
  trackId: TrackId;
  coverPath: string | null;
  lyricPath: string | null;
  embeddedLyrics: string | null;
}

interface TrackRow {
  id: string;
  path: string;
  path_key: string;
  directory: string;
  directory_key: string;
  file_hash: string | null;
  title: string;
  artist: string;
  album: string;
  album_artist: string;
  year: number | null;
  genre: string | null;
  duration: number;
  format: string;
  bitrate: number | null;
  sample_rate: number | null;
  cover_path: string | null;
  lyric_path: string | null;
  embedded_lyrics: string | null;
  is_favorite: number;
  play_count: number;
  added_at: string;
  last_played_at: string | null;
  status: TrackStatus;
  search_blob: string;
}

interface ArtistSummaryRow {
  id: string;
  name: string;
  normalized_name: string;
  track_count: number;
  album_count: number;
  cover_path: string | null;
}

interface AlbumSummaryRow {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  track_count: number;
  cover_path: string | null;
  added_at: string;
}

interface PlaylistRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface PlaylistItemRow {
  playlist_id: string;
  track_id: string;
  sort_index: number;
  added_at: string;
}

interface HistoryRow {
  history_id: number;
  track_id: string;
  played_at: string;
  source_type: string;
  source_id: string;
}

const DEFAULT_TRACK_SORT = "addedAt" as const;

const createTrackIdFromPath = (path: string, fileHash: string | null, title: string) =>
  createTrackId([pathKey(path), fileHash ?? "no-hash", title].join("|"));

const mapTrackRow = (row: TrackRow): Track => ({
  id: row.id as TrackId,
  path: row.path,
  directory: row.directory,
  title: row.title,
  artist: row.artist,
  album: row.album,
  albumArtist: row.album_artist,
  year: row.year,
  genre: row.genre,
  duration: row.duration,
  format: row.format,
  bitrate: row.bitrate,
  sampleRate: row.sample_rate,
  coverPath: row.cover_path,
  lyricPath: row.lyric_path,
  isFavorite: toBoolean(row.is_favorite),
  playCount: row.play_count,
  addedAt: row.added_at,
  lastPlayedAt: row.last_played_at,
  status: row.status,
  fileHash: row.file_hash
});

const mapPlaylistRow = (row: PlaylistRow): PlaylistSummary => ({
  id: row.id as PlaylistId,
  name: row.name,
  trackCount: 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapSettingValue = (value: SettingValue) => JSON.stringify(value);

const parseSettingValue = (value: string): SettingValue => JSON.parse(value) as SettingValue;

const ORDER_BY_TRACK: Record<NonNullable<TrackListQuery["sortBy"]>, string> = {
  title: "t.title COLLATE NOCASE",
  artist: "t.artist COLLATE NOCASE",
  album: "t.album COLLATE NOCASE",
  addedAt: "t.added_at",
  lastPlayedAt: "t.last_played_at",
  duration: "t.duration"
};

const ORDER_BY_ALBUM: Record<NonNullable<AlbumListQuery["sortBy"]>, string> = {
  title: "title COLLATE NOCASE",
  artist: "artist COLLATE NOCASE",
  year: "year",
  addedAt: "added_at"
};

const ORDER_BY_ARTIST: Record<NonNullable<ArtistListQuery["sortBy"]>, string> = {
  name: "name COLLATE NOCASE",
  trackCount: "track_count",
  albumCount: "album_count"
};

const ORDER_BY_FOLDER: Record<NonNullable<FolderListQuery["sortBy"]>, string> = {
  path: "path_key",
  trackCount: "track_count"
};

const direction = (value: SortDirection | undefined) => (value === "desc" ? "DESC" : "ASC");

export class AuralRepository {
  constructor(private readonly database: AuralDatabase) {}

  refreshLibrarySummaries(updatedAt = nowIso()): void {
    this.database.transaction(() => {
      this.database.db.prepare("DELETE FROM artist_summaries").run();
      this.database.db.prepare("DELETE FROM album_summaries").run();

      this.database.db.prepare(
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

      this.database.db.prepare(
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
  }

  ensureLibrarySummaries(): void {
    const summaryCount = this.database.db.prepare("SELECT COUNT(*) AS count FROM artist_summaries").get() as { count?: number } | undefined;
    const trackCount = this.database.db.prepare("SELECT COUNT(*) AS count FROM tracks").get() as { count?: number } | undefined;

    if (Number(summaryCount?.count ?? 0) === 0 && Number(trackCount?.count ?? 0) > 0) {
      this.refreshLibrarySummaries();
    }
  }

  upsertTrack(input: TrackRecordInput): Track {
    const path = normalizePath(input.path);
    const directory = normalizePath(input.directory ?? path.split("\\").slice(0, -1).join("\\"));
    const addedAt = input.addedAt ?? nowIso();
    const searchBlob = buildSearchBlob(input.title, input.artist, input.album, input.albumArtist, path, directory);
    const existingById = input.id ? this.findTrackById(input.id) : null;
    const existingByPath = this.findTrackByPath(path);
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
      this.database.db.prepare(`
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
      return this.findTrackById(recordId)!;
    }

    if (existingByPath) {
      this.database.db.prepare(`
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
      return this.findTrackByPath(path)!;
    }

    this.database.db.prepare(`
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
    `).run({
      ...payload
    });

    return this.findTrackByPath(path) ?? this.findTrackById(recordId)!;
  }

  upsertTracks(inputs: TrackRecordInput[]) {
    return this.database.transaction(() => inputs.map((input) => this.upsertTrack(input)));
  }

  findTrackById(id: TrackId | string): Track | null {
    const row = this.database.db.prepare("SELECT * FROM tracks WHERE id = ?").get(id) as TrackRow | undefined;
    return row ? mapTrackRow(row) : null;
  }

  findTrackByPath(path: string): Track | null {
    const row = this.database.db.prepare("SELECT * FROM tracks WHERE path_key = ?").get(pathKey(path)) as TrackRow | undefined;
    return row ? mapTrackRow(row) : null;
  }

  findTracksByHash(fileHash: string): Track[] {
    return (this.database.db.prepare("SELECT * FROM tracks WHERE file_hash = ?").all(fileHash) as unknown as TrackRow[]).map(mapTrackRow);
  }

  findTrackMediaById(id: TrackId | string): TrackMediaRecord | null {
    const row = this.database.db
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
  }

  markTracksMissing(trackIds: TrackId[]): number {
    if (trackIds.length === 0) {
      return 0;
    }
    const placeholders = trackIds.map(() => "?").join(", ");
    return this.database.db
      .prepare(`UPDATE tracks SET status = 'missing' WHERE id IN (${placeholders})`)
      .run(...trackIds).changes as number;
  }

  deleteTrackById(trackId: TrackId): Track | null {
    const track = this.findTrackById(trackId);
    if (!track) {
      return null;
    }

    this.database.db.prepare("DELETE FROM tracks WHERE id = ?").run(trackId);
    this.refreshLibrarySummaries();

    return track;
  }

  listTracks(query: TrackListQuery = {}): Track[] {
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

    return (this.database.db.prepare(sql).all(params) as unknown as TrackRow[]).map(mapTrackRow);
  }

  getArtistDetail(artistId: string): ArtistDetail | null {
    const summary = this.database.db.prepare(
      `
      SELECT id, name, normalized_name, track_count, album_count, cover_path
      FROM artist_summaries
      WHERE id = ?
    `
    ).get(artistId) as ArtistSummaryRow | undefined;

    if (!summary) {
      return null;
    }

    const tracks = (
      this.database.db.prepare(
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
      tracks,
      totalDurationSeconds: tracks.reduce((sum, track) => sum + track.duration, 0)
    };
  }

  listArtists(query: ArtistListQuery = {}): ArtistSummary[] {
    const sortBy = query.sortBy ?? "name";
    const orderBy = ORDER_BY_ARTIST[sortBy];
    return (
      this.database.db.prepare(
        `
        SELECT
          id,
          name,
          normalized_name,
          track_count,
          album_count,
          cover_path
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
      coverPath: row.cover_path ?? null
    }));
  }

  getAlbumDetail(albumId: string): AlbumDetail | null {
    const summary = this.database.db.prepare(
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
      this.database.db.prepare(
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
  }

  listAlbums(query: AlbumListQuery = {}): AlbumSummary[] {
    const sortBy = query.sortBy ?? "title";
    const orderBy = ORDER_BY_ALBUM[sortBy];
    return (
      this.database.db.prepare(
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
  }

  listFolders(query: FolderListQuery = {}): FolderSummary[] {
    const sortBy = query.sortBy ?? "path";
    const orderBy = ORDER_BY_FOLDER[sortBy];
    return (
      this.database.db.prepare(
        `
        SELECT
          sf.path AS path,
          sf.path_key AS path_key,
          COUNT(t.id) AS track_count,
          SUM(CASE WHEN t.status <> 'ready' THEN 1 ELSE 0 END) AS missing_count
        FROM scan_folders sf
        LEFT JOIN tracks t
          ON (t.path_key = sf.path_key OR t.path_key LIKE sf.path_key || '\\%')
        WHERE sf.is_active = 1
        GROUP BY sf.path, sf.path_key
        ORDER BY ${orderBy} ${direction(query.sortDirection)}
      `
      ).all() as Array<{ path: string; track_count: number; missing_count: number }>
    ).map((row) => ({
      path: row.path,
      trackCount: Number(row.track_count),
      missingCount: Number(row.missing_count ?? 0)
    }));
  }

  getOverview() {
    const row = this.database.db.prepare(
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
    ).get() as
      | {
          tracks: number;
          albums: number;
          artists: number;
          playlists: number;
          totalDurationSeconds: number;
        }
      | undefined;

    return {
      tracks: Number(row?.tracks ?? 0),
      albums: Number(row?.albums ?? 0),
      artists: Number(row?.artists ?? 0),
      playlists: Number(row?.playlists ?? 0),
      totalDurationSeconds: Number(row?.totalDurationSeconds ?? 0)
    };
  }

  createPlaylist(input: CreatePlaylistInput): PlaylistSummary {
    const createdAt = nowIso();
    const playlistId = createPlaylistId(`${input.name}:${createdAt}`);
    this.database.db.prepare(
      "INSERT INTO playlists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run(playlistId, input.name.trim(), createdAt, createdAt);
    return this.getPlaylist(playlistId)!;
  }

  renamePlaylist(playlistId: PlaylistId, name: string): PlaylistSummary | null {
    const updatedAt = nowIso();
    this.database.db.prepare("UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?").run(name.trim(), updatedAt, playlistId);
    return this.getPlaylist(playlistId);
  }

  deletePlaylist(playlistId: PlaylistId): boolean {
    const result = this.database.db.prepare("DELETE FROM playlists WHERE id = ?").run(playlistId);
    return result.changes > 0;
  }

  listPlaylists(): PlaylistSummary[] {
    return (this.database.db.prepare("SELECT * FROM playlists ORDER BY updated_at DESC").all() as unknown as PlaylistRow[]).map((row) => ({
        ...mapPlaylistRow(row),
        trackCount: this.countTracksInPlaylist(row.id)
      }));
  }

  getPlaylist(playlistId: PlaylistId): (PlaylistSummary & { tracks: Track[] }) | null {
    const playlist = this.database.db.prepare("SELECT * FROM playlists WHERE id = ?").get(playlistId) as PlaylistRow | undefined;
    if (!playlist) {
      return null;
    }

    const items = this.database.db
      .prepare("SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_index ASC")
      .all(playlistId) as unknown as PlaylistItemRow[];
    const tracks = items
      .map((item) => this.findTrackById(item.track_id))
      .filter((track): track is Track => Boolean(track));

    return {
      ...mapPlaylistRow(playlist),
      trackCount: items.length,
      tracks
    };
  }

  addToPlaylist(input: PlaylistMutationInput): (PlaylistSummary & { tracks: Track[] }) | null {
    const playlist = this.database.db.prepare("SELECT * FROM playlists WHERE id = ?").get(input.playlistId) as PlaylistRow | undefined;
    if (!playlist || input.trackIds.length === 0) {
      return playlist ? this.getPlaylist(input.playlistId) : null;
    }

    const nextIndexRow = this.database.db
      .prepare("SELECT COALESCE(MAX(sort_index), -1) + 1 AS next_index FROM playlist_items WHERE playlist_id = ?")
      .get(input.playlistId) as { next_index?: number } | undefined;
    let nextIndex = Number(nextIndexRow?.next_index ?? 0);
    const now = nowIso();
    const insert = this.database.db.prepare(`
      INSERT INTO playlist_items (playlist_id, track_id, sort_index, added_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(playlist_id, track_id) DO UPDATE SET
        sort_index = excluded.sort_index,
        added_at = excluded.added_at
    `);

    for (const trackId of input.trackIds) {
      insert.run(input.playlistId, trackId, nextIndex, now);
      nextIndex += 1;
    }

    this.database.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(now, input.playlistId);
    return this.getPlaylist(input.playlistId);
  }

  removeFromPlaylist(input: PlaylistMutationInput): (PlaylistSummary & { tracks: Track[] }) | null {
    if (input.trackIds.length === 0) {
      return this.getPlaylist(input.playlistId);
    }

    const placeholders = input.trackIds.map(() => "?").join(", ");
    this.database.db
      .prepare(`DELETE FROM playlist_items WHERE playlist_id = ? AND track_id IN (${placeholders})`)
      .run(input.playlistId, ...input.trackIds);
    this.normalizePlaylistOrder(input.playlistId);
    this.database.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(nowIso(), input.playlistId);
    return this.getPlaylist(input.playlistId);
  }

  toggleFavorite(trackId: TrackId): boolean {
    const track = this.findTrackById(trackId);
    if (!track) {
      return false;
    }

    const next = track.isFavorite ? 0 : 1;
    this.database.db.prepare("UPDATE tracks SET is_favorite = ? WHERE id = ?").run(next, trackId);
    return Boolean(next);
  }

  getFavorites(): Track[] {
    return this.listTracks({ favoritesOnly: true, sortBy: "addedAt", sortDirection: "desc" });
  }

  recordPlay(trackId: TrackId, sourceType = "library", sourceId = "library"): void {
    const playedAt = nowIso();
    this.database.transaction(() => {
      this.database.db
        .prepare("INSERT INTO play_history (track_id, played_at, source_type, source_id) VALUES (?, ?, ?, ?)")
        .run(trackId, playedAt, sourceType, sourceId);
      this.database.db.prepare("UPDATE tracks SET play_count = play_count + 1, last_played_at = ? WHERE id = ?").run(playedAt, trackId);
    });
  }

  getRecentHistory(limit = 20): Track[] {
    return (
      this.database.db.prepare(
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
  }

  prunePlayHistory(maxItems: number): number {
    const normalizedLimit = Math.max(0, Math.floor(maxItems));
    if (normalizedLimit === 0) {
      return this.clearPlayHistory();
    }

    return this.database.transaction(() => {
      const beforeCount = Number(
        (this.database.db.prepare("SELECT COUNT(*) AS count FROM play_history").get() as { count: number } | undefined)?.count ?? 0
      );

      this.database.db.prepare(
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

      this.database.db.prepare(
        `
        UPDATE tracks
        SET last_played_at = NULL
        WHERE id NOT IN (SELECT DISTINCT track_id FROM play_history)
      `
      ).run();

      const afterCount = Number(
        (this.database.db.prepare("SELECT COUNT(*) AS count FROM play_history").get() as { count: number } | undefined)?.count ?? 0
      );

      return Math.max(0, beforeCount - afterCount);
    });
  }

  clearPlayHistory(): number {
    return this.database.transaction(() => {
      const removed = Number(this.database.db.prepare("DELETE FROM play_history").run().changes);
      this.database.db.prepare("UPDATE tracks SET last_played_at = NULL").run();
      return removed;
    });
  }

  listScanFolders(): ScanFolderRecord[] {
    return (this.database.db.prepare("SELECT * FROM scan_folders ORDER BY created_at ASC").all() as unknown as ScanFolderRecord[]).map((row) => ({
        folder_id: row.folder_id,
        path: row.path,
        path_key: row.path_key,
        created_at: row.created_at,
        last_scanned_at: row.last_scanned_at,
        is_active: Boolean(row.is_active)
      }));
  }

  upsertScanFolders(paths: string[]): ScanFolderRecord[] {
    const createdAt = nowIso();
    const stmt = this.database.db.prepare(
      `
      INSERT INTO scan_folders (path, path_key, created_at, last_scanned_at, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(path_key) DO UPDATE SET
        path = excluded.path,
        is_active = 1
    `
    );
    for (const folderPath of paths) {
      const normalized = normalizePath(folderPath);
      stmt.run(normalized, pathKey(normalized), createdAt, createdAt);
    }
    return this.listScanFolders();
  }

  markScanFoldersScanned(paths: string[], scannedAt = nowIso()): void {
    const stmt = this.database.db.prepare("UPDATE scan_folders SET last_scanned_at = ?, is_active = 1 WHERE path_key = ?");
    for (const folderPath of paths) {
      const normalized = normalizePath(folderPath);
      stmt.run(scannedAt, pathKey(normalized));
    }
  }

  deactivateMissingScanFolders(activePaths: string[]): number {
    const activeKeys = activePaths.map((folderPath) => pathKey(normalizePath(folderPath)));
    if (activeKeys.length === 0) {
      return Number(this.database.db.prepare("UPDATE scan_folders SET is_active = 0").run().changes);
    }
    const placeholders = activeKeys.map(() => "?").join(", ");
    return this.database.db
      .prepare(`UPDATE scan_folders SET is_active = 0 WHERE path_key NOT IN (${placeholders})`)
      .run(...activeKeys).changes as number;
  }

  removeScanFolder(path: string): {
    folder: string;
    removedFromScanList: boolean;
    removedTracks: number;
    activeFolders: string[];
  } {
    const normalized = normalizePath(path);
    const normalizedKey = pathKey(normalized);
    const result = this.database.transaction(() => {
      const removedFromScanList =
        this.database.db.prepare("DELETE FROM scan_folders WHERE path_key = ?").run(normalizedKey).changes > 0;

      const removedTracks = this.database.db.prepare(
        `
        DELETE FROM tracks
        WHERE NOT EXISTS (
          SELECT 1
          FROM scan_folders sf
          WHERE sf.is_active = 1
            AND (tracks.path_key = sf.path_key OR tracks.path_key LIKE sf.path_key || '\\%')
        )
      `
      ).run().changes;

      const activeFolders = (
        this.database.db.prepare(
          `
          SELECT path
          FROM scan_folders
          WHERE is_active = 1
          ORDER BY created_at ASC
        `
        ).all() as Array<{ path: string }>
      ).map((row) => row.path);

      return {
        folder: normalized,
        removedFromScanList,
        removedTracks: Number(removedTracks),
        activeFolders
      };
    });

    // Keep summary refresh outside the delete transaction to avoid nested BEGIN/COMMIT.
    this.refreshLibrarySummaries();
    return result;
  }

  setSetting(key: SettingKey, value: SettingValue): SettingRecord {
    const updatedAt = nowIso();
    this.database.db
      .prepare(
        `
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `
      )
      .run(key, mapSettingValue(value), updatedAt);
    return { key, value, updatedAt };
  }

  getSetting(key: SettingKey): SettingRecord | null {
    const row = this.database.db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as
      | { key: SettingKey; value: string; updated_at: string }
      | undefined;
    return row ? { key: row.key, value: parseSettingValue(row.value), updatedAt: row.updated_at } : null;
  }

  getAllSettings(): SettingRecord[] {
    return (this.database.db.prepare("SELECT * FROM settings ORDER BY key ASC").all() as Array<{ key: SettingKey; value: string; updated_at: string }>).map((row) => ({
        key: row.key,
        value: parseSettingValue(row.value),
        updatedAt: row.updated_at
      }));
  }

  searchTracks(term: string, limit = 50): Track[] {
    return this.listTracks({
      search: term,
      limit,
      sortBy: "addedAt",
      sortDirection: "desc"
    });
  }

  searchArtists(term: string): ArtistSummary[] {
    const normalized = buildSearchBlob(term);
    return this.listArtists().filter((artist) => buildSearchBlob(artist.name).includes(normalized));
  }

  searchAlbums(term: string): AlbumSummary[] {
    const normalized = buildSearchBlob(term);
    return this.listAlbums().filter((album) => buildSearchBlob(album.title, album.artist).includes(normalized));
  }

  searchPlaylists(term: string): PlaylistSummary[] {
    const normalized = buildSearchBlob(term);
    return this.listPlaylists().filter((playlist) => buildSearchBlob(playlist.name).includes(normalized));
  }

  private countTracksInPlaylist(playlistId: string) {
    const row = this.database.db.prepare("SELECT COUNT(*) AS count FROM playlist_items WHERE playlist_id = ?").get(playlistId) as { count?: number } | undefined;
    return Number(row?.count ?? 0);
  }

  private normalizePlaylistOrder(playlistId: string) {
    const items = this.database.db.prepare("SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_index ASC").all(playlistId) as unknown as PlaylistItemRow[];
    const stmt = this.database.db.prepare("UPDATE playlist_items SET sort_index = ? WHERE playlist_id = ? AND track_id = ?");
    items.forEach((item: PlaylistItemRow, index: number) => {
      stmt.run(index, playlistId, item.track_id);
    });
  }
}
