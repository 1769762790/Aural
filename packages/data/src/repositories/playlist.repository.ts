import { nowIso } from "../helpers";
import type { AuralDatabase } from "../store";
import { createPlaylistId, mapPlaylistRow } from "./mappers";
import type { CreatePlaylistInput, PlaylistId, PlaylistItemRow, PlaylistMutationInput, PlaylistRow, PlaylistSummary, Track } from "./types";

const countTracksInPlaylist = (database: AuralDatabase, playlistId: string) => {
  const row = database.db.prepare("SELECT COUNT(*) AS count FROM playlist_items WHERE playlist_id = ?").get(playlistId) as { count?: number } | undefined;
  return Number(row?.count ?? 0);
};

const normalizePlaylistOrder = (database: AuralDatabase, playlistId: string) => {
  const items = database.db.prepare("SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_index ASC").all(playlistId) as unknown as PlaylistItemRow[];
  const stmt = database.db.prepare("UPDATE playlist_items SET sort_index = ? WHERE playlist_id = ? AND track_id = ?");
  items.forEach((item, index) => {
    stmt.run(index, playlistId, item.track_id);
  });
};

export const createPlaylist = (
  database: AuralDatabase,
  input: CreatePlaylistInput,
  getPlaylistFn: (playlistId: PlaylistId) => (PlaylistSummary & { tracks: Track[] }) | null
): PlaylistSummary => {
  const createdAt = nowIso();
  const playlistId = createPlaylistId(`${input.name}:${createdAt}`);
  database.db.prepare("INSERT INTO playlists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(playlistId, input.name.trim(), createdAt, createdAt);
  return getPlaylistFn(playlistId)!;
};

export const renamePlaylist = (
  database: AuralDatabase,
  playlistId: PlaylistId,
  name: string,
  getPlaylistFn: (playlistId: PlaylistId) => (PlaylistSummary & { tracks: Track[] }) | null
) => {
  const updatedAt = nowIso();
  database.db.prepare("UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?").run(name.trim(), updatedAt, playlistId);
  return getPlaylistFn(playlistId);
};

export const deletePlaylist = (database: AuralDatabase, playlistId: PlaylistId): boolean =>
  database.db.prepare("DELETE FROM playlists WHERE id = ?").run(playlistId).changes > 0;

export const listPlaylists = (database: AuralDatabase): PlaylistSummary[] =>
  (database.db.prepare("SELECT * FROM playlists ORDER BY updated_at DESC").all() as unknown as PlaylistRow[]).map((row) => ({
    ...mapPlaylistRow(row),
    trackCount: countTracksInPlaylist(database, row.id)
  }));

export const getPlaylist = (
  database: AuralDatabase,
  playlistId: PlaylistId,
  findTrackByIdFn: (trackId: string) => Track | null
): (PlaylistSummary & { tracks: Track[] }) | null => {
  const playlist = database.db.prepare("SELECT * FROM playlists WHERE id = ?").get(playlistId) as PlaylistRow | undefined;
  if (!playlist) {
    return null;
  }

  const items = database.db.prepare("SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_index ASC").all(playlistId) as unknown as PlaylistItemRow[];
  const tracks = items.map((item) => findTrackByIdFn(item.track_id)).filter((track): track is Track => Boolean(track));

  return {
    ...mapPlaylistRow(playlist),
    trackCount: items.length,
    tracks
  };
};

export const addToPlaylist = (
  database: AuralDatabase,
  input: PlaylistMutationInput,
  getPlaylistFn: (playlistId: PlaylistId) => (PlaylistSummary & { tracks: Track[] }) | null
) => {
  const playlist = database.db.prepare("SELECT * FROM playlists WHERE id = ?").get(input.playlistId) as PlaylistRow | undefined;
  if (!playlist || input.trackIds.length === 0) {
    return playlist ? getPlaylistFn(input.playlistId) : null;
  }

  const nextIndexRow = database.db
    .prepare("SELECT COALESCE(MAX(sort_index), -1) + 1 AS next_index FROM playlist_items WHERE playlist_id = ?")
    .get(input.playlistId) as { next_index?: number } | undefined;
  let nextIndex = Number(nextIndexRow?.next_index ?? 0);
  const now = nowIso();
  const insert = database.db.prepare(`
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

  database.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(now, input.playlistId);
  return getPlaylistFn(input.playlistId);
};

export const removeFromPlaylist = (
  database: AuralDatabase,
  input: PlaylistMutationInput,
  getPlaylistFn: (playlistId: PlaylistId) => (PlaylistSummary & { tracks: Track[] }) | null
) => {
  if (input.trackIds.length === 0) {
    return getPlaylistFn(input.playlistId);
  }

  const placeholders = input.trackIds.map(() => "?").join(", ");
  database.db.prepare(`DELETE FROM playlist_items WHERE playlist_id = ? AND track_id IN (${placeholders})`).run(input.playlistId, ...input.trackIds);
  normalizePlaylistOrder(database, input.playlistId);
  database.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(nowIso(), input.playlistId);
  return getPlaylistFn(input.playlistId);
};

export const searchPlaylists = (listPlaylistsFn: () => PlaylistSummary[], buildSearchBlobFn: (...parts: Array<string | null | undefined>) => string, term: string) => {
  const normalized = buildSearchBlobFn(term);
  return listPlaylistsFn().filter((playlist) => buildSearchBlobFn(playlist.name).includes(normalized));
};
