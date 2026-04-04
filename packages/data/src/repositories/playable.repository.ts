import { buildSearchBlob, normalizePath, nowIso, pathKey } from "../helpers";
import type { AuralDatabase } from "../store";
import { ORDER_BY_ARTIST, direction, mapPlayableItemRow, mapTrackToPlayableItem } from "./mappers";
import type {
  ArtistListQuery,
  ArtistSummary,
  ArtistSummaryRow,
  DownloadedAssetRow,
  PlayableItem,
  PlayableArtistDetail,
  PlayableItemRecordInput,
  PlayableItemRow,
  PlaylistId,
  PlaylistSummary,
  PlaylistMutationInput,
  Track
} from "./types";

const PLAYABLE_SELECT = `
  SELECT
    p.*,
    CASE WHEN f.playable_item_id IS NULL THEN 0 ELSE 1 END AS is_favorite,
    COALESCE(d.local_path, p.downloaded_path) AS asset_local_path
  FROM playable_items p
  LEFT JOIN favorite_items f ON f.playable_item_id = p.id
  LEFT JOIN downloaded_assets d ON d.playable_item_id = p.id
`;

const getPlayableById = (database: AuralDatabase, itemId: string): PlayableItem | null => {
  const row = database.db.prepare(`${PLAYABLE_SELECT} WHERE p.id = ?`).get(itemId) as PlayableItemRow | undefined;
  return row ? mapPlayableItemRow(row) : null;
};

const getPlayableByProvider = (database: AuralDatabase, provider: string, providerItemId: string): PlayableItem | null => {
  const row = database.db
    .prepare(`${PLAYABLE_SELECT} WHERE p.provider = ? AND p.provider_item_id = ?`)
    .get(provider, providerItemId) as PlayableItemRow | undefined;
  return row ? mapPlayableItemRow(row) : null;
};

export const syncLocalTrackToPlayableItem = (database: AuralDatabase, track: Track): PlayableItem => {
  const normalizedPath = track.path ? normalizePath(track.path) : null;
  const normalizedDirectory = track.directory ? normalizePath(track.directory) : null;
  const lyricsAvailability = track.lyricPath ? "file" : "none";
  const payload = {
    id: track.id,
    source: "local",
    provider: null,
    provider_item_id: null,
    title: track.title,
    artist: track.artist,
    album: track.album,
    album_artist: track.albumArtist,
    year: track.year,
    genre: track.genre,
    duration: track.duration,
    format: track.format,
    bitrate: track.bitrate,
    sample_rate: track.sampleRate,
    cover_path: track.coverPath,
    cover_url: null,
    lyric_path: track.lyricPath,
    path: normalizedPath,
    directory: normalizedDirectory,
    play_count: track.playCount,
    added_at: track.addedAt,
    last_played_at: track.lastPlayedAt,
    status: track.status,
    file_hash: track.fileHash,
    lyrics_availability: lyricsAvailability,
    downloaded_path: null,
    local_track_id: track.id,
    search_blob: buildSearchBlob(track.title, track.artist, track.album, track.albumArtist, normalizedPath, normalizedDirectory)
  };

  database.db.prepare(`
    INSERT INTO playable_items (
      id, source, provider, provider_item_id, title, artist, album, album_artist,
      year, genre, duration, format, bitrate, sample_rate, cover_path, cover_url,
      lyric_path, path, directory, play_count, added_at, last_played_at, status,
      file_hash, lyrics_availability, downloaded_path, local_track_id, search_blob
    ) VALUES (
      @id, @source, @provider, @provider_item_id, @title, @artist, @album, @album_artist,
      @year, @genre, @duration, @format, @bitrate, @sample_rate, @cover_path, @cover_url,
      @lyric_path, @path, @directory, @play_count, @added_at, @last_played_at, @status,
      @file_hash, @lyrics_availability, @downloaded_path, @local_track_id, @search_blob
    )
    ON CONFLICT(id) DO UPDATE SET
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
      path = excluded.path,
      directory = excluded.directory,
      play_count = excluded.play_count,
      added_at = excluded.added_at,
      last_played_at = excluded.last_played_at,
      status = excluded.status,
      file_hash = excluded.file_hash,
      lyrics_availability = excluded.lyrics_availability,
      local_track_id = excluded.local_track_id,
      search_blob = excluded.search_blob
  `).run(payload);

  if (track.isFavorite) {
    database.db.prepare("INSERT OR IGNORE INTO favorite_items (playable_item_id, created_at) VALUES (?, ?)").run(track.id, track.addedAt);
  }

  return getPlayableById(database, track.id) ?? mapTrackToPlayableItem(track);
};

export const upsertPlayableItem = (database: AuralDatabase, input: PlayableItemRecordInput): PlayableItem => {
  const normalizedPath = input.path ? normalizePath(input.path) : null;
  const normalizedDirectory = input.directory ? normalizePath(input.directory) : null;
  const existingByProvider =
    input.source === "online" && input.provider && input.providerItemId
      ? getPlayableByProvider(database, input.provider, input.providerItemId)
      : null;
  const recordId = existingByProvider?.id ?? input.id;
  const addedAt = input.addedAt ?? existingByProvider?.addedAt ?? nowIso();
  const payload = {
    id: recordId,
    source: input.source,
    provider: input.provider ?? null,
    provider_item_id: input.providerItemId ?? null,
    title: input.title,
    artist: input.artist,
    album: input.album,
    album_artist: input.albumArtist ?? input.artist,
    year: input.year ?? null,
    genre: input.genre ?? null,
    duration: input.duration ?? 0,
    format: input.format ?? "STREAM",
    bitrate: input.bitrate ?? null,
    sample_rate: input.sampleRate ?? null,
    cover_path: input.coverPath ?? null,
    cover_url: input.coverUrl ?? null,
    lyric_path: input.lyricPath ?? null,
    path: normalizedPath,
    directory: normalizedDirectory,
    play_count: input.playCount ?? existingByProvider?.playCount ?? 0,
    added_at: addedAt,
    last_played_at: input.lastPlayedAt ?? existingByProvider?.lastPlayedAt ?? null,
    status: input.status ?? "ready",
    file_hash: input.fileHash ?? null,
    lyrics_availability: input.lyricsAvailability ?? "none",
    downloaded_path: input.downloadedPath ?? existingByProvider?.downloadedPath ?? null,
    local_track_id: input.localTrackId ?? existingByProvider?.localTrackId ?? null,
    search_blob: buildSearchBlob(input.title, input.artist, input.album, input.albumArtist ?? input.artist, normalizedPath, normalizedDirectory)
  };

  database.db.prepare(`
    INSERT INTO playable_items (
      id, source, provider, provider_item_id, title, artist, album, album_artist,
      year, genre, duration, format, bitrate, sample_rate, cover_path, cover_url,
      lyric_path, path, directory, play_count, added_at, last_played_at, status,
      file_hash, lyrics_availability, downloaded_path, local_track_id, search_blob
    ) VALUES (
      @id, @source, @provider, @provider_item_id, @title, @artist, @album, @album_artist,
      @year, @genre, @duration, @format, @bitrate, @sample_rate, @cover_path, @cover_url,
      @lyric_path, @path, @directory, @play_count, @added_at, @last_played_at, @status,
      @file_hash, @lyrics_availability, @downloaded_path, @local_track_id, @search_blob
    )
    ON CONFLICT(id) DO UPDATE SET
      source = excluded.source,
      provider = excluded.provider,
      provider_item_id = excluded.provider_item_id,
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
      cover_url = excluded.cover_url,
      lyric_path = excluded.lyric_path,
      path = excluded.path,
      directory = excluded.directory,
      play_count = excluded.play_count,
      last_played_at = excluded.last_played_at,
      status = excluded.status,
      file_hash = excluded.file_hash,
      lyrics_availability = excluded.lyrics_availability,
      downloaded_path = excluded.downloaded_path,
      local_track_id = excluded.local_track_id,
      search_blob = excluded.search_blob
  `).run(payload);

  if (input.isFavorite) {
    database.db.prepare("INSERT OR IGNORE INTO favorite_items (playable_item_id, created_at) VALUES (?, ?)").run(recordId, addedAt);
  }

  return getPlayableById(database, recordId)!;
};

export const findPlayableItemById = (database: AuralDatabase, itemId: string): PlayableItem | null =>
  getPlayableById(database, itemId);

export const findPlayableItemByProvider = (database: AuralDatabase, provider: string, providerItemId: string): PlayableItem | null =>
  getPlayableByProvider(database, provider, providerItemId);

export const listPlayableItemsByIds = (database: AuralDatabase, itemIds: string[]): PlayableItem[] => {
  if (!itemIds.length) {
    return [];
  }

  const placeholders = itemIds.map(() => "?").join(", ");
  const rows = database.db
    .prepare(`${PLAYABLE_SELECT} WHERE p.id IN (${placeholders})`)
    .all(...itemIds) as unknown as PlayableItemRow[];
  const itemMap = new Map(rows.map((row) => [row.id, mapPlayableItemRow(row)]));
  return itemIds.map((itemId) => itemMap.get(itemId)).filter((item): item is PlayableItem => Boolean(item));
};

export const listFavoriteItems = (database: AuralDatabase, mode: "local" | "online" | "all" = "all"): PlayableItem[] => {
  const params: Array<string | number> = [];
  const modeFilter = mode === "all" ? "" : "AND p.source = ?";
  if (mode !== "all") {
    params.push(mode);
  }
  const rows = database.db
    .prepare(`
      ${PLAYABLE_SELECT}
      INNER JOIN favorite_items fav ON fav.playable_item_id = p.id
      WHERE 1 = 1 ${modeFilter}
      ORDER BY fav.created_at DESC, p.added_at DESC
    `)
    .all(...params) as unknown as PlayableItemRow[];
  return rows.map(mapPlayableItemRow);
};

export const toggleFavoriteItem = (database: AuralDatabase, itemId: string): boolean => {
  const current = database.db
    .prepare("SELECT playable_item_id FROM favorite_items WHERE playable_item_id = ?")
    .get(itemId) as { playable_item_id?: string } | undefined;
  const nextFavorite = !current?.playable_item_id;
  const item = getPlayableById(database, itemId);
  if (!item) {
    return false;
  }

  database.transaction(() => {
    if (nextFavorite) {
      database.db.prepare("INSERT OR REPLACE INTO favorite_items (playable_item_id, created_at) VALUES (?, ?)").run(itemId, nowIso());
    } else {
      database.db.prepare("DELETE FROM favorite_items WHERE playable_item_id = ?").run(itemId);
    }

    if (item.localTrackId) {
      database.db.prepare("UPDATE tracks SET is_favorite = ? WHERE id = ?").run(nextFavorite ? 1 : 0, item.localTrackId);
    }
  });

  return nextFavorite;
};

const countItemsInPlaylist = (database: AuralDatabase, playlistId: string) => {
  const row = database.db
    .prepare("SELECT COUNT(*) AS count FROM playlist_entries WHERE playlist_id = ?")
    .get(playlistId) as { count?: number } | undefined;
  return Number(row?.count ?? 0);
};

export const listPlaylistsWithPlayableItems = (database: AuralDatabase): PlaylistSummary[] =>
  (database.db.prepare("SELECT * FROM playlists ORDER BY updated_at DESC").all() as Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
    id: row.id as PlaylistId,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    trackCount: countItemsInPlaylist(database, row.id)
  }));

export const getPlaylistWithPlayableItems = (
  database: AuralDatabase,
  playlistId: PlaylistId
): (PlaylistSummary & { items: PlayableItem[] }) | null => {
  const playlist = database.db
    .prepare("SELECT * FROM playlists WHERE id = ?")
    .get(playlistId) as { id: string; name: string; created_at: string; updated_at: string } | undefined;
  if (!playlist) {
    return null;
  }

  const rows = database.db
    .prepare(`
      ${PLAYABLE_SELECT}
      INNER JOIN playlist_entries pe ON pe.playable_item_id = p.id
      WHERE pe.playlist_id = ?
      ORDER BY pe.sort_index ASC
    `)
    .all(playlistId) as unknown as PlayableItemRow[];

  return {
    id: playlist.id as PlaylistId,
    name: playlist.name,
    createdAt: playlist.created_at,
    updatedAt: playlist.updated_at,
    trackCount: rows.length,
    items: rows.map(mapPlayableItemRow)
  };
};

const normalizePlaylistOrder = (database: AuralDatabase, playlistId: string) => {
  const items = database.db
    .prepare("SELECT playable_item_id FROM playlist_entries WHERE playlist_id = ? ORDER BY sort_index ASC")
    .all(playlistId) as Array<{ playable_item_id: string }>;
  const stmt = database.db.prepare("UPDATE playlist_entries SET sort_index = ? WHERE playlist_id = ? AND playable_item_id = ?");
  items.forEach((item, index) => {
    stmt.run(index, playlistId, item.playable_item_id);
  });
};

export const addPlayableItemsToPlaylist = (
  database: AuralDatabase,
  input: PlaylistMutationInput
): (PlaylistSummary & { items: PlayableItem[] }) | null => {
  if (!input.itemIds.length) {
    return getPlaylistWithPlayableItems(database, input.playlistId);
  }

  const nextIndexRow = database.db
    .prepare("SELECT COALESCE(MAX(sort_index), -1) + 1 AS next_index FROM playlist_entries WHERE playlist_id = ?")
    .get(input.playlistId) as { next_index?: number } | undefined;
  let nextIndex = Number(nextIndexRow?.next_index ?? 0);
  const now = nowIso();
  const insert = database.db.prepare(`
    INSERT INTO playlist_entries (playlist_id, playable_item_id, sort_index, added_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(playlist_id, playable_item_id) DO UPDATE SET
      sort_index = excluded.sort_index,
      added_at = excluded.added_at
  `);

  for (const itemId of input.itemIds) {
    insert.run(input.playlistId, itemId, nextIndex, now);
    nextIndex += 1;
  }

  database.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(now, input.playlistId);
  return getPlaylistWithPlayableItems(database, input.playlistId);
};

export const removePlayableItemsFromPlaylist = (
  database: AuralDatabase,
  input: PlaylistMutationInput
): (PlaylistSummary & { items: PlayableItem[] }) | null => {
  if (!input.itemIds.length) {
    return getPlaylistWithPlayableItems(database, input.playlistId);
  }

  const placeholders = input.itemIds.map(() => "?").join(", ");
  database.db
    .prepare(`DELETE FROM playlist_entries WHERE playlist_id = ? AND playable_item_id IN (${placeholders})`)
    .run(input.playlistId, ...input.itemIds);
  normalizePlaylistOrder(database, input.playlistId);
  database.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(nowIso(), input.playlistId);
  return getPlaylistWithPlayableItems(database, input.playlistId);
};

export const recordPlayableItemPlay = (
  database: AuralDatabase,
  itemId: string,
  sourceType = "library",
  sourceId = "library"
): void => {
  const playedAt = nowIso();
  const item = getPlayableById(database, itemId);
  if (!item) {
    return;
  }

  database.transaction(() => {
    database.db
      .prepare("INSERT INTO play_history_items (playable_item_id, played_at, source_type, source_id) VALUES (?, ?, ?, ?)")
      .run(itemId, playedAt, sourceType, sourceId);
    database.db
      .prepare("UPDATE playable_items SET play_count = play_count + 1, last_played_at = ? WHERE id = ?")
      .run(playedAt, itemId);
    if (item.localTrackId) {
      database.db.prepare("UPDATE tracks SET play_count = play_count + 1, last_played_at = ? WHERE id = ?").run(playedAt, item.localTrackId);
    }
  });
};

export const getRecentPlayableHistory = (
  database: AuralDatabase,
  limit = 20,
  mode: "local" | "online" | "all" = "all"
): PlayableItem[] => {
  const params: Array<string | number> = [limit];
  const modeFilter = mode === "all" ? "" : "AND p.source = ?";
  if (mode !== "all") {
    params.push(mode);
  }
  const rows = database.db
    .prepare(`
      SELECT recent.played_at AS recent_played_at, result.*
      FROM (
        SELECT playable_item_id, MAX(played_at) AS played_at
        FROM play_history_items
        GROUP BY playable_item_id
        ORDER BY played_at DESC
        LIMIT ?
      ) AS recent
      INNER JOIN (
        ${PLAYABLE_SELECT}
      ) AS result ON result.id = recent.playable_item_id
      INNER JOIN playable_items p ON p.id = result.id
      WHERE 1 = 1 ${modeFilter}
      ORDER BY recent.played_at DESC
    `)
    .all(...params) as unknown as PlayableItemRow[];
  return rows.map(mapPlayableItemRow);
};

export const clearPlayableHistory = (database: AuralDatabase): number =>
  database.transaction(() => {
    const removed = Number(database.db.prepare("DELETE FROM play_history_items").run().changes);
    database.db.prepare("UPDATE playable_items SET last_played_at = NULL").run();
    database.db.prepare("UPDATE tracks SET last_played_at = NULL").run();
    return removed;
  });

export const prunePlayableHistory = (database: AuralDatabase, maxItems: number): number => {
  const normalizedLimit = Math.max(0, Math.floor(maxItems));
  if (normalizedLimit === 0) {
    return clearPlayableHistory(database);
  }

  return database.transaction(() => {
    const beforeCount = Number(
      (database.db.prepare("SELECT COUNT(*) AS count FROM play_history_items").get() as { count?: number } | undefined)?.count ?? 0
    );

    database.db.prepare(`
      DELETE FROM play_history_items
      WHERE playable_item_id NOT IN (
        SELECT playable_item_id
        FROM (
          SELECT playable_item_id, MAX(played_at) AS played_at
          FROM play_history_items
          GROUP BY playable_item_id
          ORDER BY played_at DESC
          LIMIT ?
        )
      )
    `).run(normalizedLimit);

    database.db.prepare(`
      UPDATE playable_items
      SET last_played_at = NULL
      WHERE id NOT IN (SELECT DISTINCT playable_item_id FROM play_history_items)
    `).run();

    database.db.prepare(`
      UPDATE tracks
      SET last_played_at = NULL
      WHERE id NOT IN (
        SELECT DISTINCT local_track_id
        FROM playable_items
        WHERE local_track_id IS NOT NULL
          AND id IN (SELECT DISTINCT playable_item_id FROM play_history_items)
      )
    `).run();

    const afterCount = Number(
      (database.db.prepare("SELECT COUNT(*) AS count FROM play_history_items").get() as { count?: number } | undefined)?.count ?? 0
    );
    return Math.max(0, beforeCount - afterCount);
  });
};

export const upsertDownloadedAsset = (database: AuralDatabase, row: DownloadedAssetRow): DownloadedAssetRow => {
  const normalizedPath = normalizePath(row.local_path);
  database.transaction(() => {
    database.db.prepare(`
      INSERT INTO downloaded_assets (playable_item_id, provider, provider_item_id, local_path, status, downloaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(playable_item_id) DO UPDATE SET
        provider = excluded.provider,
        provider_item_id = excluded.provider_item_id,
        local_path = excluded.local_path,
        status = excluded.status,
        downloaded_at = excluded.downloaded_at
    `).run(row.playable_item_id, row.provider, row.provider_item_id, normalizedPath, row.status, row.downloaded_at);

    database.db.prepare("UPDATE playable_items SET downloaded_path = ? WHERE id = ?").run(normalizedPath, row.playable_item_id);
  });

  return {
    ...row,
    local_path: normalizedPath
  };
};

export const getDownloadedAsset = (database: AuralDatabase, itemId: string): DownloadedAssetRow | null => {
  const row = database.db
    .prepare("SELECT * FROM downloaded_assets WHERE playable_item_id = ?")
    .get(itemId) as DownloadedAssetRow | undefined;
  return row ?? null;
};

export const listDownloadedAssets = (database: AuralDatabase): DownloadedAssetRow[] =>
  database.db
    .prepare("SELECT * FROM downloaded_assets ORDER BY downloaded_at DESC")
    .all() as unknown as DownloadedAssetRow[];

export const listOnlineArtists = (database: AuralDatabase, query: ArtistListQuery = {}): ArtistSummary[] => {
  const sortBy = query.sortBy ?? "name";
  const orderBy = ORDER_BY_ARTIST[sortBy];
  return (
    database.db.prepare(
      `
      WITH online_artist_items AS (
        SELECT
          id,
          COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist') AS artist_name,
          LOWER(COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist')) AS artist_key,
          COALESCE(NULLIF(TRIM(album), ''), 'Unknown Album') AS album_title,
          cover_path,
          cover_url,
          added_at,
          last_played_at
        FROM playable_items
        WHERE source = 'online'
          AND status <> 'invalid'
      )
      SELECT
        artist_key AS id,
        artist_name AS name,
        artist_key AS normalized_name,
        COUNT(*) AS track_count,
        COUNT(DISTINCT album_title) AS album_count,
        (
          SELECT o2.cover_path
          FROM online_artist_items o2
          WHERE o2.artist_key = o.artist_key
            AND o2.cover_path IS NOT NULL
            AND o2.cover_path <> ''
          ORDER BY COALESCE(o2.last_played_at, o2.added_at) DESC, o2.id DESC
          LIMIT 1
        ) AS cover_path,
        (
          SELECT o2.cover_url
          FROM online_artist_items o2
          WHERE o2.artist_key = o.artist_key
            AND o2.cover_url IS NOT NULL
            AND o2.cover_url <> ''
          ORDER BY COALESCE(o2.last_played_at, o2.added_at) DESC, o2.id DESC
          LIMIT 1
        ) AS cover_url
      FROM online_artist_items o
      GROUP BY artist_key, artist_name
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

export const getOnlineArtistDetail = (database: AuralDatabase, artistId: string): PlayableArtistDetail | null => {
  const summary = database.db.prepare(
    `
    WITH online_artist_items AS (
      SELECT
        id,
        COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist') AS artist_name,
        LOWER(COALESCE(NULLIF(TRIM(artist), ''), 'Unknown Artist')) AS artist_key,
        COALESCE(NULLIF(TRIM(album), ''), 'Unknown Album') AS album_title,
        cover_path,
        cover_url,
        added_at,
        last_played_at
      FROM playable_items
      WHERE source = 'online'
        AND status <> 'invalid'
    )
    SELECT
      artist_key AS id,
      artist_name AS name,
      artist_key AS normalized_name,
      COUNT(*) AS track_count,
      COUNT(DISTINCT album_title) AS album_count,
      (
        SELECT o2.cover_path
        FROM online_artist_items o2
        WHERE o2.artist_key = o.artist_key
          AND o2.cover_path IS NOT NULL
          AND o2.cover_path <> ''
        ORDER BY COALESCE(o2.last_played_at, o2.added_at) DESC, o2.id DESC
        LIMIT 1
      ) AS cover_path,
      (
        SELECT o2.cover_url
        FROM online_artist_items o2
        WHERE o2.artist_key = o.artist_key
          AND o2.cover_url IS NOT NULL
          AND o2.cover_url <> ''
        ORDER BY COALESCE(o2.last_played_at, o2.added_at) DESC, o2.id DESC
        LIMIT 1
      ) AS cover_url
    FROM online_artist_items o
    WHERE artist_key = ?
    GROUP BY artist_key, artist_name
  `
  ).get(artistId) as ArtistSummaryRow | undefined;

  if (!summary) {
    return null;
  }

  const rows = database.db.prepare(
    `
      ${PLAYABLE_SELECT}
      WHERE p.source = 'online'
        AND p.status <> 'invalid'
        AND LOWER(COALESCE(NULLIF(TRIM(p.artist), ''), 'Unknown Artist')) = ?
      ORDER BY COALESCE(p.last_played_at, p.added_at) DESC, p.title COLLATE NOCASE ASC
    `
  ).all(artistId) as unknown as PlayableItemRow[];

  const tracks = rows.map(mapPlayableItemRow);
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

export const removePlayableItem = (database: AuralDatabase, itemId: string): void => {
  database.db.prepare("DELETE FROM playable_items WHERE id = ?").run(itemId);
};
