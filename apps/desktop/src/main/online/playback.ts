import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { DownloadedAssetRecord } from "@aural/contracts";
import type { AuralRepository } from "@aural/data";
import type { PlaybackAsset } from "@aural/domain";
import { DEFAULT_PROVIDER, fileExists, resolveDownloadDirectory, safeFileSegment } from "./shared";

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
  resolveSetting: (key: "online.downloadDirectory" | "online.preferDownloadedCopy" | "online.providerBaseUrl") => unknown;
  ensureOnlineItem: (itemId: string) => Promise<Awaited<ReturnType<AuralRepository["findPlayableItemById"]>> | null>;
}

export const createOnlinePlaybackService = ({ repository, userDataPath, resolveSetting, ensureOnlineItem }: OnlinePlaybackServiceOptions) => {
  const resolvePlayback = async (itemId: string): Promise<PlaybackAsset | null> => {
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
      const fileName = `${safeFileSegment(item.artist)} - ${safeFileSegment(item.title)}-${item.providerItemId}${guessedExt}`;
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
    getDefaultDownloadDirectory: async () => resolveDownloadDirectory(userDataPath, null)
  };
};

const nowIso = () => new Date().toISOString();
