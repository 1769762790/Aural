// @ts-ignore
import { stat } from "node:fs/promises";
import type { Track } from "@aural/domain";
import type { AuralRepository, TrackRecordInput } from "@aural/data";
import { pathKey } from "@aural/data";
import { writeEmbeddedArtwork } from "./artwork-cache";
import { hashFile } from "./hash";
import { readAudioMetadata, resolveArtworkPath, resolveLyricPath, type TagEncodingPreference } from "./metadata";
import { inferTrackDirectory, isPathWithinFolder, normalizeFolderPath, type ScanRules, collectAudioFiles } from "./scanner";
import type { ImportFoldersResult } from "./types";

interface TrackIngestOptions {
  repository: AuralRepository;
  artworkCacheDir?: string;
}

export const ingestTrackFile = async (
  options: TrackIngestOptions,
  filePath: string,
  existing: Track | null,
  tagEncodingPreference: TagEncodingPreference,
  precomputedFileHash?: string
) => {
  const fileHash = precomputedFileHash ?? (await hashFile(filePath));
  const metadata = await readAudioMetadata(filePath, tagEncodingPreference);
  const existingMedia = existing?.id ? options.repository.findTrackMediaById(existing.id) : null;
  const lyricPath = (await resolveLyricPath(filePath)) ?? existing?.lyricPath ?? existingMedia?.lyricPath ?? null;
  const embeddedCoverPath = metadata.embeddedArtwork
    ? await writeEmbeddedArtwork(options.artworkCacheDir, fileHash, metadata.embeddedArtwork)
    : null;
  const coverPath =
    embeddedCoverPath ??
    (await resolveArtworkPath(inferTrackDirectory(filePath))) ??
    existing?.coverPath ??
    existingMedia?.coverPath ??
    null;

  const input: TrackRecordInput = {
    id: existing?.id,
    path: filePath,
    directory: inferTrackDirectory(filePath),
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    albumArtist: metadata.albumArtist,
    year: metadata.year,
    genre: metadata.genre,
    duration: metadata.duration,
    format: metadata.format,
    bitrate: metadata.bitrate,
    sampleRate: metadata.sampleRate,
    coverPath,
    lyricPath,
    embeddedLyrics: metadata.embeddedLyrics ?? existingMedia?.embeddedLyrics ?? null,
    fileHash,
    isFavorite: existing?.isFavorite,
    playCount: existing?.playCount,
    addedAt: existing?.addedAt,
    lastPlayedAt: existing?.lastPlayedAt,
    status: existing?.status
  };

  return options.repository.upsertTrack(input);
};

export const importFolders = async (
  options: TrackIngestOptions,
  paths: string[],
  scanRules: ScanRules,
  tagEncodingPreference: TagEncodingPreference
): Promise<ImportFoldersResult> => {
  const folders = Array.from(new Set(paths.map(normalizeFolderPath)));
  if (folders.length === 0) {
    return {
      scanRunId: "scan-empty" as ImportFoldersResult["scanRunId"],
      folders: [],
      scannedFiles: 0,
      importedTracks: 0,
      invalidFiles: 0
    };
  }

  const { createScanRunId } = await import("@aural/domain");
  options.repository.upsertScanFolders(folders);
  const scanRunId = createScanRunId(`${folders.join("|")}:${Date.now()}`);
  const seenPaths = new Set<string>();
  let scannedFiles = 0;
  let importedTracks = 0;
  let invalidFiles = 0;

  const filePaths = await collectAudioFiles(folders, scanRules);
  const existingTracks = options.repository.listTracks();
  const byHash = new Map<string, Track>();
  const byPathKey = new Map<string, Track>();
  for (const track of existingTracks) {
    if (track.fileHash) {
      byHash.set(track.fileHash, track);
    }
    byPathKey.set(pathKey(track.path), track);
  }

  const seenTrackIds = new Set<string>();

  for (const filePath of filePaths) {
    scannedFiles += 1;
    const normalizedPath = pathKey(filePath);
    if (seenPaths.has(normalizedPath)) {
      continue;
    }
    seenPaths.add(normalizedPath);

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        invalidFiles += 1;
        continue;
      }
      const fileHash = await hashFile(filePath);
      const existing = byPathKey.get(normalizedPath) ?? byHash.get(fileHash) ?? null;
      const saved = await ingestTrackFile(options, filePath, existing, tagEncodingPreference, fileHash);
      seenTrackIds.add(saved.id);
      importedTracks += 1;
    } catch {
      invalidFiles += 1;
    }
  }

  const missingTracks = existingTracks.filter(
    (track) => folders.some((folder) => isPathWithinFolder(track.path, folder)) && !seenTrackIds.has(track.id)
  );
  if (missingTracks.length > 0) {
    options.repository.markTracksMissing(missingTracks.map((track) => track.id));
  }

  options.repository.markScanFoldersScanned(folders);
  options.repository.refreshLibrarySummaries();

  return {
    scanRunId,
    folders,
    scannedFiles,
    importedTracks,
    invalidFiles
  };
};
