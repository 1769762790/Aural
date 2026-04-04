import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ClearCachedMediaResult, DownloadedAssetRecord } from "@aural/contracts";
import type { AuralRepository } from "@aural/data";
import type { PlaybackAsset } from "@aural/domain";
import {
  DEFAULT_PROVIDER,
  fileExists,
  resolveCacheDirectory,
  resolveDownloadDirectory,
  resolveImageCacheDirectory,
  resolveLyricsCacheDirectory,
  resolveStreamCacheDirectory,
  safeFileSegment
} from "./shared";

const require = createRequire(import.meta.url);

type UnmMatch = (
  id: number,
  source?: string[]
) => Promise<{ size: number; br: number | null; url: string | null; md5: string | null; source: string }>;

const unmMatch = require("@unblockneteasemusic/server") as UnmMatch;
const EMBEDDED_UNM_SOURCES = ["qq", "kugou", "migu", "bodian"] as const;

interface OnlinePlaybackServiceOptions {
  repository: AuralRepository;
  userDataPath: string;
  resolveSetting: (
    key:
      | "online.downloadDirectory"
      | "online.preferDownloadedCopy"
      | "online.providerBaseUrl"
      | "online.cacheDirectory"
      | "online.cacheMaxSizeGb"
      | "online.musicNamingFormat"
  ) => unknown;
  ensureOnlineItem: (itemId: string) => Promise<Awaited<ReturnType<AuralRepository["findPlayableItemById"]>> | null>;
}

export const createOnlinePlaybackService = ({ repository, userDataPath, resolveSetting, ensureOnlineItem }: OnlinePlaybackServiceOptions) => {
  const resolvePlayback = async (itemId: string): Promise<PlaybackAsset | null> => {
    await pruneManagedCacheToLimit(userDataPath, resolveSetting("online.cacheDirectory"), resolveSetting("online.cacheMaxSizeGb"));

    const item = await ensureOnlineItem(itemId);
    if (!item?.providerItemId) {
      return null;
    }

    const preferDownloadedCopy = resolveSetting("online.preferDownloadedCopy") !== false;
    const downloaded = repository.getDownloadedAsset(itemId);
    if (preferDownloadedCopy && downloaded?.local_path && (await fileExists(downloaded.local_path))) {
      return {
        kind: "file",
        path: downloaded.local_path
      };
    }

    const matched = await unmMatch(Number(item.providerItemId), [...EMBEDDED_UNM_SOURCES]).catch(() => null);
    if (!matched?.url) {
      return null;
    }

    return {
      kind: "stream",
      streamUrl: matched.url,
      expiresAt: null
    };
  };

  return {
    resolvePlayback,
    download: async (itemId: string): Promise<DownloadedAssetRecord | null> => {
      const item = await ensureOnlineItem(itemId);
      if (!item?.providerItemId || !item.provider) {
        return null;
      }

      const existing = repository.getDownloadedAsset(itemId);
      if (existing?.local_path && (await fileExists(existing.local_path))) {
        return {
          itemId,
          provider: existing.provider,
          providerItemId: existing.provider_item_id,
          localPath: existing.local_path,
          status: existing.status,
          downloadedAt: existing.downloaded_at
        };
      }

      const asset = await resolvePlayback(itemId);
      if (!asset) {
        return null;
      }

      if (asset.kind === "file" && asset.path) {
        const record = repository.upsertDownloadedAsset({
          playable_item_id: itemId,
          provider: item.provider,
          provider_item_id: item.providerItemId,
          local_path: asset.path,
          status: "ready",
          downloaded_at: nowIso()
        });
        return {
          itemId,
          provider: record.provider,
          providerItemId: record.provider_item_id,
          localPath: record.local_path,
          status: record.status,
          downloadedAt: record.downloaded_at
        };
      }

      if (!asset.streamUrl) {
        return null;
      }

      const downloadDirectory = resolveDownloadDirectory(userDataPath, resolveSetting("online.downloadDirectory"));
      await mkdir(downloadDirectory, { recursive: true });
      const guessedExt = (() => {
        try {
          const parsed = new URL(asset.streamUrl);
          const ext = path.extname(parsed.pathname);
          return ext || ".mp3";
        } catch {
          return ".mp3";
        }
      })();
      const fileName = `${buildTrackFileBaseName(
        item.artist,
        item.title,
        item.providerItemId,
        resolveSetting("online.musicNamingFormat")
      )}${guessedExt}`;
      const targetPath = path.join(downloadDirectory, fileName);
      const response = await fetch(asset.streamUrl);
      if (!response.ok || !response.body) {
        repository.upsertDownloadedAsset({
          playable_item_id: itemId,
          provider: item.provider,
          provider_item_id: item.providerItemId,
          local_path: targetPath,
          status: "failed",
          downloaded_at: null
        });
        return null;
      }

      await pipeline(
        Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream),
        createWriteStream(targetPath)
      );

      const record = repository.upsertDownloadedAsset({
        playable_item_id: itemId,
        provider: item.provider,
        provider_item_id: item.providerItemId,
        local_path: targetPath,
        status: "ready",
        downloaded_at: nowIso()
      });

      return {
        itemId,
        provider: record.provider,
        providerItemId: record.provider_item_id,
        localPath: record.local_path,
        status: record.status,
        downloadedAt: record.downloaded_at
      };
    },
    listDownloads: async (): Promise<DownloadedAssetRecord[]> =>
      repository.listDownloadedAssets().map((row) => ({
        itemId: row.playable_item_id,
        provider: row.provider ?? DEFAULT_PROVIDER,
        providerItemId: row.provider_item_id,
        localPath: row.local_path,
        status: row.status,
        downloadedAt: row.downloaded_at
      })),
    getDefaultDownloadDirectory: async () => resolveDownloadDirectory(userDataPath, null),
    getDefaultCacheDirectory: async () => resolveCacheDirectory(userDataPath, null),
    clearCachedMedia: async (): Promise<ClearCachedMediaResult> => {
      const configuredCacheDirectory = resolveSetting("online.cacheDirectory");
      const managedCacheDirs = [
        resolveStreamCacheDirectory(userDataPath, configuredCacheDirectory),
        resolveImageCacheDirectory(userDataPath, configuredCacheDirectory),
        resolveLyricsCacheDirectory(userDataPath, configuredCacheDirectory)
      ];

      let clearedFiles = 0;
      let clearedBytes = 0;

      for (const targetDir of managedCacheDirs) {
        const stats = await collectDirectoryStats(targetDir);
        clearedFiles += stats.files;
        clearedBytes += stats.bytes;

        await rm(targetDir, { recursive: true, force: true });
        await mkdir(targetDir, { recursive: true });
      }

      return {
        clearedFiles,
        clearedBytes
      };
    }
  };
};

const nowIso = () => new Date().toISOString();

const buildTrackFileBaseName = (artist: string, title: string, providerItemId: string, configuredFormat: unknown) => {
  const normalizedArtist = safeFileSegment(artist);
  const normalizedTitle = safeFileSegment(title);
  const format = normalizeNamingFormat(configuredFormat);

  switch (format) {
    case "title":
      return `${normalizedTitle}-${providerItemId}`;
    case "title-artist":
      return `${normalizedTitle} - ${normalizedArtist}-${providerItemId}`;
    case "artist-title":
    default:
      return `${normalizedArtist} - ${normalizedTitle}-${providerItemId}`;
  }
};

const normalizeNamingFormat = (value: unknown) => {
  if (value === "title" || value === "title-artist" || value === "artist-title") {
    return value;
  }

  return "artist-title";
};

const pruneManagedCacheToLimit = async (userDataPath: string, configuredCacheDirectory: unknown, configuredLimitGb: unknown) => {
  const managedCacheDirs = [
    resolveStreamCacheDirectory(userDataPath, configuredCacheDirectory),
    resolveImageCacheDirectory(userDataPath, configuredCacheDirectory),
    resolveLyricsCacheDirectory(userDataPath, configuredCacheDirectory)
  ];
  const limitBytes = Math.max(0, Number(configuredLimitGb ?? 1)) * 1024 * 1024 * 1024;

  if (!Number.isFinite(limitBytes) || limitBytes <= 0) {
    return;
  }

  const files = await collectManagedCacheFiles(managedCacheDirs);
  let totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes <= limitBytes) {
    return;
  }

  files.sort((left, right) => left.mtimeMs - right.mtimeMs);
  for (const file of files) {
    if (totalBytes <= limitBytes) {
      break;
    }

    await rm(file.path, { force: true });
    totalBytes -= file.size;
  }
};

const collectDirectoryStats = async (targetPath: string): Promise<{ files: number; bytes: number }> => {
  try {
    const entries = await readdir(targetPath, { withFileTypes: true });
    let files = 0;
    let bytes = 0;

    for (const entry of entries) {
      const nextPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        const nested = await collectDirectoryStats(nextPath);
        files += nested.files;
        bytes += nested.bytes;
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const info = await stat(nextPath);
      files += 1;
      bytes += info.size;
    }

    return { files, bytes };
  } catch {
    return { files: 0, bytes: 0 };
  }
};

const collectManagedCacheFiles = async (directories: string[]) => {
  const files: Array<{ path: string; size: number; mtimeMs: number }> = [];

  for (const targetPath of directories) {
    await collectManagedCacheFilesFromDirectory(targetPath, files);
  }

  return files;
};

const collectManagedCacheFilesFromDirectory = async (
  targetPath: string,
  files: Array<{ path: string; size: number; mtimeMs: number }>
) => {
  try {
    const entries = await readdir(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      const nextPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        await collectManagedCacheFilesFromDirectory(nextPath, files);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const info = await stat(nextPath);
      files.push({
        path: nextPath,
        size: info.size,
        mtimeMs: info.mtimeMs
      });
    }
  } catch {
    // Ignore missing directories and continue.
  }
};
