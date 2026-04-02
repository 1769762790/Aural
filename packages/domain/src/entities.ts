import type { PlaylistId, QueueId, TrackId } from "./ids";

export type TrackStatus = "ready" | "missing" | "invalid";
export type PlaybackMode = "queue" | "shuffle" | "repeat-one";
export type ThemeMode = "system" | "light" | "dark";
export type SearchScope = "all" | "tracks" | "artists" | "albums" | "playlists";
export type SortDirection = "asc" | "desc";
export type MediaSource = "local" | "online";
export type OnlineProviderId = "unblockneteasemusic";
export type LyricsAvailability = "embedded" | "file" | "remote" | "none";
export type BrowseMode = "local" | "online";
export type SettingKey =
  | "appearance.mode"
  | "appearance.accent"
  | "appearance.customAccents"
  | "appearance.motion"
  | "appearance.coverColor"
  | "appearance.dynamicCoverGradient"
  | "appearance.playerArtworkBreathing"
  | "player.volume"
  | "player.startupAutoplay"
  | "player.replayGainEnabled"
  | "player.playbackRate"
  | "player.playbackMode"
  | "player.shuffleStrategy"
  | "player.outputDeviceId"
  | "player.channelMode"
  | "player.channelBalance"
  | "player.fadeEnabled"
  | "player.fadeMode"
  | "player.crossfadeSeconds"
  | "player.session"
  | "player.resume"
  | "player.otherAppAudioPolicy"
  | "player.headphoneInsertAction"
  | "player.headphoneRemoveAction"
  | "lyrics.enabled"
  | "lyrics.align"
  | "library.autoScanOnStartup"
  | "library.scanAllowedFormats"
  | "library.minFileMb"
  | "library.excludeHiddenFiles"
  | "library.tagEncoding"
  | "library.allowMetadataEditing"
  | "library.confirmLocalSourceDeletion"
  | "history.maxItems"
  | "history.clearOnExit"
  | "library.density"
  | "settings.centerDraft"
  | "online.enabled"
  | "online.providerBaseUrl"
  | "online.preferDownloadedCopy"
  | "online.downloadDirectory"
  | "online.lastMode";

export type SettingValue = string | number | boolean | null;

export interface Track {
  id: TrackId;
  path: string;
  directory: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  year: number | null;
  genre: string | null;
  duration: number;
  format: string;
  bitrate: number | null;
  sampleRate: number | null;
  coverPath: string | null;
  lyricPath: string | null;
  isFavorite: boolean;
  playCount: number;
  addedAt: string;
  lastPlayedAt: string | null;
  status: TrackStatus;
  fileHash: string | null;
}

export interface PlayableItem {
  id: TrackId;
  source: MediaSource;
  provider: OnlineProviderId | null;
  providerItemId: string | null;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  year: number | null;
  genre: string | null;
  duration: number;
  format: string;
  bitrate: number | null;
  sampleRate: number | null;
  coverPath: string | null;
  coverUrl: string | null;
  lyricPath: string | null;
  path: string | null;
  directory: string | null;
  isFavorite: boolean;
  playCount: number;
  addedAt: string;
  lastPlayedAt: string | null;
  status: TrackStatus;
  fileHash: string | null;
  lyricsAvailability: LyricsAvailability;
  downloadedPath: string | null;
  localTrackId: TrackId | null;
}

export interface PlaybackAsset {
  kind: "file" | "stream";
  path?: string | null;
  streamUrl?: string | null;
  expiresAt?: string | null;
}

export interface ArtistSummary {
  id: string;
  name: string;
  normalizedName: string;
  trackCount: number;
  albumCount: number;
  coverPath: string | null;
  coverUrl: string | null;
}

export interface AlbumSummary {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  trackCount: number;
  coverPath: string | null;
}

export interface ArtistDetail extends ArtistSummary {
  tracks: Track[];
  totalDurationSeconds: number;
}

export interface PlayableArtistDetail extends ArtistSummary {
  tracks: PlayableItem[];
  totalDurationSeconds: number;
}

export interface AlbumDetail extends AlbumSummary {
  tracks: Track[];
  totalDurationSeconds: number;
}

export interface FolderSummary {
  path: string;
  trackCount: number;
  missingCount: number;
}

export interface PlaylistSummary {
  id: PlaylistId;
  name: string;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueItem {
  id: string;
  queueId: QueueId;
  trackId: TrackId;
  sourceType: "album" | "artist" | "folder" | "playlist" | "search" | "library" | "favorites" | "history" | "online";
  sourceId: string;
  position: number;
}

export interface PlayableSession {
  mode: BrowseMode;
  queue: QueueItem[];
  currentItemId: TrackId | null;
  progressSeconds: number;
}

export interface PlaybackState {
  queueId: QueueId | null;
  currentTrackId: TrackId | null;
  currentIndex: number;
  isPlaying: boolean;
  progressSeconds: number;
  durationSeconds: number;
  volume: number;
  playbackRate: number;
  playbackMode: PlaybackMode;
  shuffleSeed: number | null;
}

export interface SearchTrackHit extends Track {
  matchRank: number;
  reason: "exact" | "prefix" | "fuzzy" | "pinyin" | "initials";
}
