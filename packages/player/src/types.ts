export type Brand<K, T> = K & { __brand: T };

export type TrackId = Brand<string, "TrackId">;
export type PlaylistId = Brand<string, "PlaylistId">;
export type QueueId = Brand<string, "QueueId">;

export type TrackStatus = "ready" | "missing" | "invalid";
export type PlaybackMode = "queue" | "shuffle" | "repeat-one";

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

export interface QueueItem {
  id: string;
  queueId: QueueId;
  trackId: TrackId;
  sourceType: "album" | "artist" | "folder" | "playlist" | "search" | "library" | "favorites" | "history" | "online";
  sourceId: string;
  position: number;
}

export interface QueueState {
  queueId: QueueId;
  items: QueueItem[];
  currentIndex: number;
  playbackMode: PlaybackMode;
  shuffleSeed: number | null;
  itemSeed: number;
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

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const createTrackId = (value: string) =>
  `trk_${hashString(value).slice(0, 12)}` as TrackId;

export const createQueueId = (value: string) =>
  `que_${hashString(value).slice(0, 12)}` as QueueId;
