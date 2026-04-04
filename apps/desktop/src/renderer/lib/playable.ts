import type { PlayableItem, Track } from "@aural/domain";
import { toFileUrl } from "./fileUrl";

export const trackToPlayableItem = (track: Track): PlayableItem => ({
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

export const tracksToPlayableItems = (tracks: Track[]) => tracks.map(trackToPlayableItem);

export const isLocalPlayableItem = (item: PlayableItem | null | undefined): item is PlayableItem & { path: string } =>
  Boolean(item && item.source === "local" && typeof item.path === "string" && item.path.length);

export const playableItemToTrack = (item: PlayableItem | null | undefined): Track | null => {
  if (!isLocalPlayableItem(item)) {
    return null;
  }

  return {
    id: item.id,
    path: item.path,
    directory: item.directory ?? "",
    title: item.title,
    artist: item.artist,
    album: item.album,
    albumArtist: item.albumArtist,
    year: item.year,
    genre: item.genre,
    duration: item.duration,
    format: item.format,
    bitrate: item.bitrate,
    sampleRate: item.sampleRate,
    coverPath: item.coverPath,
    lyricPath: item.lyricPath,
    isFavorite: item.isFavorite,
    playCount: item.playCount,
    addedAt: item.addedAt,
    lastPlayedAt: item.lastPlayedAt,
    status: item.status,
    fileHash: item.fileHash
  };
};

export const resolvePlayableCoverUrl = (item: Pick<PlayableItem, "coverPath" | "coverUrl"> | null | undefined) => {
  if (!item) {
    return null;
  }

  if (item.coverPath) {
    return toFileUrl(item.coverPath);
  }

  return item.coverUrl ?? null;
};
