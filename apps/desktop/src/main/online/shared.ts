import { access } from "node:fs/promises";
import path from "node:path";
import type { LyricsResponse } from "@aural/contracts";
import { createTrackId, type ArtistSummary, type OnlineProviderId } from "@aural/domain";
import { createLyricsSnapshot } from "@aural/player";
import type { EnhancedSearchArtist, EnhancedSearchSong } from "../enhanced-client";

export const DEFAULT_PROVIDER: OnlineProviderId = "unblockneteasemusic";

export const safeFileSegment = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "track";

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

export const resolveDownloadDirectory = (userDataPath: string, configured: unknown) => {
  if (typeof configured === "string" && configured.trim().length) {
    return configured.trim();
  }

  return path.join(userDataPath, "online-cache", DEFAULT_PROVIDER);
};

export const resolveCacheDirectory = (userDataPath: string, configured: unknown) => {
  if (typeof configured === "string" && configured.trim().length) {
    return configured.trim();
  }

  return path.join(userDataPath, "online-cache", "_managed-cache");
};

export const resolveStreamCacheDirectory = (userDataPath: string, configured: unknown = null) =>
  path.join(resolveCacheDirectory(userDataPath, configured), "stream");

export const resolveImageCacheDirectory = (userDataPath: string, configured: unknown = null) =>
  path.join(resolveCacheDirectory(userDataPath, configured), "images");

export const resolveLyricsCacheDirectory = (userDataPath: string, configured: unknown = null) =>
  path.join(resolveCacheDirectory(userDataPath, configured), "lyrics");

export const fileExists = async (targetPath: string) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const extractProviderItemIdFromItemId = (itemId: string) => {
  const parts = itemId.split(":");
  return parts.length >= 3 ? parts.slice(2).join(":") : null;
};

export const normalizeArtistName = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export const mapSongToPlayableInput = (song: EnhancedSearchSong) => {
  const artistEntries = song.ar ?? song.artists ?? [];
  const albumRecord = song.al ?? song.album ?? null;
  const artist = artistEntries
    .map((entry) => entry.name?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const album = albumRecord?.name?.trim() ?? "Online";
  const title = song.name?.trim() || `Track ${song.id}`;
  const providerItemId = String(song.id);

  return {
    id: createTrackId(`online:${DEFAULT_PROVIDER}:${providerItemId}`),
    source: "online" as const,
    provider: DEFAULT_PROVIDER,
    providerItemId,
    title,
    artist: artist || "Unknown Artist",
    album,
    albumArtist: artist || "Unknown Artist",
    duration: Math.max(0, Number(song.dt ?? song.duration ?? 0) / 1000),
    format: "STREAM",
    coverUrl: albumRecord?.picUrl ?? null,
    lyricsAvailability: "remote" as const,
    status: "ready" as const
  };
};

export const mapLyricsSnapshot = (itemId: string, snapshot: ReturnType<typeof createLyricsSnapshot>, source: LyricsResponse["source"]): LyricsResponse => ({
  trackId: itemId,
  source,
  lines: snapshot.lines.map((line) => ({
    at: line.timeMs,
    text: line.text,
    segments: line.segments?.map((segment) => ({
      text: segment.text,
      startMs: segment.startMs,
      endMs: segment.endMs
    }))
  }))
});

export const normalizeArtistInitial = (initial: string | number | undefined) => {
  if (initial === undefined || initial === null || initial === "") {
    return -1;
  }

  if (typeof initial === "number") {
    return initial;
  }

  const normalized = initial.trim().toLowerCase();
  if (normalized === "-1") {
    return -1;
  }

  if (normalized === "0" || normalized === "#") {
    return 0;
  }

  return /^[a-z]$/.test(normalized) ? normalized : -1;
};

export const mapArtistToSummary = (artist: EnhancedSearchArtist): ArtistSummary => ({
  id: String(artist.id),
  name: artist.name?.trim() || `Artist ${artist.id}`,
  normalizedName: normalizeArtistName(artist.name?.trim() || `Artist ${artist.id}`),
  trackCount: Math.max(0, Number(artist.musicSize ?? 0)),
  albumCount: Math.max(0, Number(artist.albumSize ?? 0)),
  coverPath: null,
  coverUrl: artist.picUrl?.trim() || artist.img1v1Url?.trim() || null
});
