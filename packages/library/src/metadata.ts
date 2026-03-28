import { stat } from "node:fs/promises";
import { parseFile, selectCover, TimestampFormat, type ILyricsTag } from "music-metadata";
import { candidateCoverPaths, candidateLyricPaths } from "./paths";
import type { AudioFileMetadata } from "./types";

export type TagEncodingPreference = "auto" | "utf-8" | "gbk";

const canReinterpretText = (value: string) => /[\u0080-\u00ff]/.test(value) && !/[^\u0000-\u00ff]/.test(value);

const decodeWithPreference = (value: string, encoding: Exclude<TagEncodingPreference, "auto">) => {
  if (!canReinterpretText(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder(encoding).decode(bytes).trim();
    return decoded.length && !decoded.includes("\ufffd") ? decoded : value;
  } catch {
    return value;
  }
};

const applyConfiguredEncoding = (value: string, encoding: TagEncodingPreference) => {
  if (encoding === "auto") {
    return value;
  }

  return decodeWithPreference(value, encoding);
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const firstText = (value: unknown, fallback: string) => {
  if (Array.isArray(value)) {
    return normalizeText(value[0], fallback);
  }
  return normalizeText(value, fallback);
};

const firstEncodedText = (value: unknown, fallback: string, encoding: TagEncodingPreference) =>
  applyConfiguredEncoding(firstText(value, fallback), encoding);

const extractYear = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.slice(0, 4), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const padMilliseconds = (value: number) => value.toString().padStart(3, "0");

const formatTimestamp = (timestampMs: number) => {
  const safeTimestamp = Math.max(0, Math.floor(timestampMs));
  const minutes = Math.floor(safeTimestamp / 60_000);
  const seconds = Math.floor((safeTimestamp % 60_000) / 1000);
  const milliseconds = safeTimestamp % 1000;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${padMilliseconds(milliseconds)}`;
};

const normalizeEmbeddedLyricsText = (content: string) => {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return normalized.length ? normalized : null;
};

const extractEmbeddedLyrics = (lyricsTags: ILyricsTag[] | undefined) => {
  if (!lyricsTags?.length) {
    return null;
  }

  for (const entry of lyricsTags) {
    if (entry.timeStampFormat === TimestampFormat.milliseconds && entry.syncText.length) {
      const lines = entry.syncText
        .filter((line) => typeof line.text === "string" && line.text.trim().length)
        .map((line) => {
          if (typeof line.timestamp !== "number" || Number.isNaN(line.timestamp)) {
            return null;
          }

          return `[${formatTimestamp(line.timestamp)}]${line.text.trim()}`;
        })
        .filter((line): line is string => Boolean(line));

      if (lines.length) {
        return lines.join("\n");
      }
    }

    const plainText = normalizeEmbeddedLyricsText(entry.text ?? "");
    if (plainText) {
      return plainText;
    }
  }

  return null;
};

export const readAudioMetadata = async (
  filePath: string,
  encoding: TagEncodingPreference = "auto"
): Promise<AudioFileMetadata> => {
  const parsed = await parseFile(filePath, { duration: true });
  const common = parsed.common;
  const format = parsed.format;
  const cover = selectCover(common.picture);

  return {
    title: firstEncodedText(common.title, filePath.split(/[\\/]/).pop() ?? "Unknown title", encoding),
    artist: firstEncodedText(common.artist, "Unknown artist", encoding),
    album: firstEncodedText(common.album, "Unknown album", encoding),
    albumArtist: firstEncodedText(common.albumartist, firstEncodedText(common.artist, "Unknown artist", encoding), encoding),
    year: extractYear(common.year ?? common.date ?? null),
    genre: (() => {
      const value = firstEncodedText(common.genre, "", encoding);
      return value.length ? value : null;
    })(),
    duration: Number(format.duration ?? 0),
    format: normalizeText(format.container, "unknown"),
    bitrate: Number.isFinite(format.bitrate ?? NaN) ? Number(format.bitrate) : null,
    sampleRate: Number.isFinite(format.sampleRate ?? NaN) ? Number(format.sampleRate) : null,
    embeddedArtwork: cover
      ? {
          data: cover.data,
          format: (() => {
            const normalized = normalizeText(cover.format, "");
            return normalized.length ? normalized : null;
          })()
        }
      : null,
    embeddedLyrics: extractEmbeddedLyrics(common.lyrics)
  };
};

export const resolveArtworkPath = async (directory: string) => {
  for (const candidate of candidateCoverPaths(directory)) {
    try {
      const fileStat = await stat(candidate);
      if (fileStat.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }
  return null;
};

export const resolveLyricPath = async (filePath: string) => {
  for (const candidate of candidateLyricPaths(filePath)) {
    try {
      const fileStat = await stat(candidate);
      if (fileStat.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }
  return null;
};
