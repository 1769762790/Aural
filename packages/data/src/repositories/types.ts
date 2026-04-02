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
} from "@aural/domain";
import type { PlaylistId, TrackId } from "@aural/domain";

export type { AlbumDetail, AlbumSummary, ArtistDetail, ArtistSummary, FolderSummary, PlaylistSummary, SearchScope, SettingKey, SettingValue, SortDirection, Track, TrackStatus, PlaylistId, TrackId };

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

export interface TrackRow {
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

export interface ArtistSummaryRow {
  id: string;
  name: string;
  normalized_name: string;
  track_count: number;
  album_count: number;
  cover_path: string | null;
}

export interface AlbumSummaryRow {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  track_count: number;
  cover_path: string | null;
  added_at: string;
}

export interface PlaylistRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItemRow {
  playlist_id: string;
  track_id: string;
  sort_index: number;
  added_at: string;
}

export interface HistoryRow {
  history_id: number;
  track_id: string;
  played_at: string;
  source_type: string;
  source_id: string;
}

export interface OverviewRecord {
  tracks: number;
  albums: number;
  artists: number;
  playlists: number;
  totalDurationSeconds: number;
}
