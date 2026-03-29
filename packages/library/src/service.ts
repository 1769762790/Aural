// @ts-ignore
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SettingValue } from "@aural/domain/src/entities";
import type { Track } from "@aural/domain/src/entities";
import type { TrackId } from "@aural/domain/src/ids";
import { createScanRunId } from "@aural/domain/src/ids";
import { hashFile } from "./hash";
import { readAudioMetadata, resolveArtworkPath, resolveLyricPath, type TagEncodingPreference } from "./metadata";
import { collectAudioFiles, inferTrackDirectory, isPathWithinFolder, normalizeFolderPath, type ScanRules } from "./scanner";
import type { ImportFoldersResult, RemoveFolderResult } from "./types";
import type { AuralRepository, TrackRecordInput } from "@aural/data";
import { pathKey } from "@aural/data";

const unique = <T>(values: T[]) => Array.from(new Set(values));
const DEFAULT_SCAN_FORMATS = ["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"];
const normalizeFormat = (value: string) => value.trim().toLowerCase().replace(/^\./, "");
const toFiniteNumber = (value: SettingValue, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value: SettingValue, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const resolveTagEncoding = (value: SettingValue): TagEncodingPreference =>
  value === "utf-8" || value === "gbk" ? value : "auto";
const parseAllowedFormats = (value: SettingValue): string[] => {
  if (Array.isArray(value)) {
    const formats = value.map((item) => normalizeFormat(String(item))).filter(Boolean);
    if (formats.length > 0) {
      return [...new Set(formats)];
    }
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeFormat(String(item))).filter(Boolean);
      }
    } catch {
      // Ignore invalid format payload and fallback below.
    }
  }
  return [...DEFAULT_SCAN_FORMATS];
};

export interface LibraryServiceOptions {
  repository: AuralRepository;
  artworkCacheDir?: string;
}

export class LibraryService {
  constructor(private readonly options: LibraryServiceOptions) {}

  private resolveTagEncodingPreference(): TagEncodingPreference {
    return resolveTagEncoding(this.options.repository.getSetting("library.tagEncoding")?.value ?? "auto");
  }

  private resolveScanRules(): ScanRules {
    const allowedFormats = parseAllowedFormats(this.options.repository.getSetting("library.scanAllowedFormats")?.value ?? null);
    const minFileMb = Math.max(0, toFiniteNumber(this.options.repository.getSetting("library.minFileMb")?.value ?? 1, 1));
    const excludeHidden = toBoolean(this.options.repository.getSetting("library.excludeHiddenFiles")?.value ?? true, true);

    return {
      allowedFormats,
      minFileMb,
      excludeHidden
    };
  }

  private inferArtworkExtension(format: string | null) {
    const normalized = format?.toLowerCase().trim() ?? "";
    if (!normalized) {
      return ".jpg";
    }

    if (normalized === "image/jpeg" || normalized === "image/jpg" || normalized === "jpeg" || normalized === "jpg") {
      return ".jpg";
    }

    if (normalized === "image/png" || normalized === "png") {
      return ".png";
    }

    if (normalized === "image/webp" || normalized === "webp") {
      return ".webp";
    }

    if (normalized === "image/gif" || normalized === "gif") {
      return ".gif";
    }

    if (normalized === "image/bmp" || normalized === "bmp") {
      return ".bmp";
    }

    const slashIndex = normalized.lastIndexOf("/");
    const extension = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
    return extension ? `.${extension.replace(/[^a-z0-9]/g, "") || "jpg"}` : ".jpg";
  }

  private async writeEmbeddedArtwork(
    fileHash: string,
    embeddedArtwork: NonNullable<Awaited<ReturnType<typeof readAudioMetadata>>["embeddedArtwork"]>
  ) {
    const cacheDir = this.options.artworkCacheDir;
    if (!cacheDir) {
      return null;
    }

    await mkdir(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `${fileHash}${this.inferArtworkExtension(embeddedArtwork.format)}`);

    try {
      const existingStat = await stat(filePath);
      if (existingStat.isFile() && existingStat.size > 0) {
        return filePath;
      }
    } catch {
      // Continue and write the cached artwork.
    }

    await writeFile(filePath, Buffer.from(embeddedArtwork.data));
    return filePath;
  }

  private async ingestTrackFile(filePath: string, existing: Track | null, precomputedFileHash?: string) {
    const fileHash = precomputedFileHash ?? (await hashFile(filePath));
    const metadata = await readAudioMetadata(filePath, this.resolveTagEncodingPreference());
    const existingMedia = existing?.id ? this.options.repository.findTrackMediaById(existing.id) : null;
    const lyricPath = (await resolveLyricPath(filePath)) ?? existing?.lyricPath ?? existingMedia?.lyricPath ?? null;
    const embeddedCoverPath = metadata.embeddedArtwork ? await this.writeEmbeddedArtwork(fileHash, metadata.embeddedArtwork) : null;
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

    return this.options.repository.upsertTrack(input);
  }

  async importFolders(paths: string[]): Promise<ImportFoldersResult> {
    const folders = unique(paths.map(normalizeFolderPath));
    if (folders.length === 0) {
      return {
        scanRunId: createScanRunId("empty"),
        folders: [],
        scannedFiles: 0,
        importedTracks: 0,
        invalidFiles: 0
      };
    }

    this.options.repository.upsertScanFolders(folders);
    const scanRunId = createScanRunId(`${folders.join("|")}:${Date.now()}`);
    const seenPaths = new Set<string>();
    let scannedFiles = 0;
    let importedTracks = 0;
    let invalidFiles = 0;

    const filePaths = await collectAudioFiles(folders, this.resolveScanRules());
    const existingTracks = this.options.repository.listTracks();
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
        const saved = await this.ingestTrackFile(filePath, existing, fileHash);
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
      this.options.repository.markTracksMissing(missingTracks.map((track) => track.id));
    }

    this.options.repository.markScanFoldersScanned(folders);
    this.options.repository.refreshLibrarySummaries();

    return {
      scanRunId,
      folders,
      scannedFiles,
      importedTracks,
      invalidFiles
    };
  }

  async rescanFolders(): Promise<ImportFoldersResult> {
    const folders = this.options.repository.listScanFolders().filter((folder) => folder.is_active).map((folder) => folder.path);
    return this.importFolders(folders);
  }

  async removeFolder(path: string): Promise<RemoveFolderResult> {
    const normalizedPath = normalizeFolderPath(path);
    return this.options.repository.removeScanFolder(normalizedPath);
  }

  async syncTrackById(trackId: TrackId): Promise<Track | null> {
    const existing = this.options.repository.findTrackById(trackId);
    if (!existing) {
      return null;
    }

    const fileStat = await stat(existing.path);
    if (!fileStat.isFile()) {
      this.options.repository.markTracksMissing([trackId]);
      this.options.repository.refreshLibrarySummaries();
      return this.options.repository.findTrackById(trackId);
    }

    const saved = await this.ingestTrackFile(existing.path, existing);
    this.options.repository.refreshLibrarySummaries();
    return saved;
  }
}

export const createLibraryService = (options: LibraryServiceOptions | AuralRepository) =>
  new LibraryService("upsertTrack" in options ? { repository: options } : options);
