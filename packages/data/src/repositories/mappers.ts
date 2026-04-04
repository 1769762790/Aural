import {
  createPlaylistId,
  createTrackId,
  type PlayableItem,
  type PlaylistId,
  type PlaylistSummary,
  type SettingValue,
  type SortDirection,
  type Track,
  type TrackId
} from "@aural/domain";
import { pathKey, toBoolean } from "../helpers";
import type {
  AlbumListQuery,
  ArtistListQuery,
  FolderListQuery,
  PlayableItemRow,
  PlaylistRow,
  TrackListQuery,
  TrackRow
} from "./types";

export const DEFAULT_TRACK_SORT = "addedAt" as const;

export const createTrackIdFromPath = (path: string, fileHash: string | null, title: string) =>
  createTrackId([pathKey(path), fileHash ?? "no-hash", title].join("|"));

export const mapTrackRow = (row: TrackRow): Track => ({
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

export const mapTrackToPlayableItem = (track: Track): PlayableItem => ({
  id: track.id,
  source: "local",
  provider: null,
  providerItemId: null,
  title: track.title,
  artist: track.artist,
  album: track.album,
  albumArtist: track.albumArtist,
  year: track.year,
  genre: track.genre,
  duration: track.duration,
  format: track.format,
  bitrate: track.bitrate,
  sampleRate: track.sampleRate,
  coverPath: track.coverPath,
  coverUrl: null,
  lyricPath: track.lyricPath,
  path: track.path,
  directory: track.directory,
  isFavorite: track.isFavorite,
  playCount: track.playCount,
  addedAt: track.addedAt,
  lastPlayedAt: track.lastPlayedAt,
  status: track.status,
  fileHash: track.fileHash,
  lyricsAvailability: track.lyricPath ? "file" : "none",
  downloadedPath: null,
  localTrackId: track.id
});

export const mapPlayableItemRow = (row: PlayableItemRow): PlayableItem => ({
  id: row.id as TrackId,
  source: row.source,
  provider: row.provider,
  providerItemId: row.provider_item_id,
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
  coverUrl: row.cover_url,
  lyricPath: row.lyric_path,
  path: row.path,
  directory: row.directory,
  isFavorite: toBoolean((row as PlayableItemRow & { is_favorite?: number }).is_favorite ?? 0),
  playCount: row.play_count,
  addedAt: row.added_at,
  lastPlayedAt: row.last_played_at,
  status: row.status,
  fileHash: row.file_hash,
  lyricsAvailability: row.lyrics_availability,
  downloadedPath: (row as PlayableItemRow & { asset_local_path?: string | null }).asset_local_path ?? row.downloaded_path,
  localTrackId: row.local_track_id as TrackId | null
});

export const mapPlaylistRow = (row: PlaylistRow): PlaylistSummary => ({
  id: row.id as PlaylistId,
  name: row.name,
  trackCount: 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const mapSettingValue = (value: SettingValue) => JSON.stringify(value);
export const parseSettingValue = (value: string): SettingValue => JSON.parse(value) as SettingValue;

export const ORDER_BY_TRACK: Record<NonNullable<TrackListQuery["sortBy"]>, string> = {
  title: "t.title COLLATE NOCASE",
  artist: "t.artist COLLATE NOCASE",
  album: "t.album COLLATE NOCASE",
  addedAt: "t.added_at",
  lastPlayedAt: "t.last_played_at",
  duration: "t.duration"
};

export const ORDER_BY_ALBUM: Record<NonNullable<AlbumListQuery["sortBy"]>, string> = {
  title: "title COLLATE NOCASE",
  artist: "artist COLLATE NOCASE",
  year: "year",
  addedAt: "added_at"
};

export const ORDER_BY_ARTIST: Record<NonNullable<ArtistListQuery["sortBy"]>, string> = {
  name: "name COLLATE NOCASE",
  trackCount: "track_count",
  albumCount: "album_count"
};

export const ORDER_BY_FOLDER: Record<NonNullable<FolderListQuery["sortBy"]>, string> = {
  path: "path_key",
  trackCount: "track_count"
};

export const direction = (value: SortDirection | undefined) => (value === "desc" ? "DESC" : "ASC");

export { createPlaylistId };
