import type { TrackId } from "./types";

export interface LyricLine {
  index: number;
  timeMs: number;
  text: string;
}

export interface LyricMetadata {
  title?: string;
  artist?: string;
  album?: string;
  by?: string;
  offsetMs?: number;
}

export interface ParsedLrc {
  metadata: LyricMetadata;
  lines: LyricLine[];
}

export interface LyricsSnapshot {
  trackId: TrackId;
  source: "lrc" | "embedded" | "none";
  metadata: LyricMetadata;
  lines: LyricLine[];
}

const tagPattern = /^\[(ar|ti|al|by|offset):([^\]]*)\]$/i;
const timestampPattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

const parseTimestamp = (minutes: string, seconds: string, fraction: string | undefined) => {
  const minuteValue = Number(minutes);
  const secondValue = Number(seconds);
  const fractionValue = fraction ? Number(fraction.padEnd(3, "0")) : 0;

  if (Number.isNaN(minuteValue) || Number.isNaN(secondValue) || Number.isNaN(fractionValue)) {
    return null;
  }

  return minuteValue * 60_000 + secondValue * 1000 + fractionValue;
};

export const parseLrc = (content: string): ParsedLrc => {
  const metadata: LyricMetadata = {};
  const lines: LyricLine[] = [];

  content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((rawLine, lineIndex) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const tagMatch = line.match(tagPattern);
      if (tagMatch) {
        const [, key, value] = tagMatch;
        const normalizedKey = key.toLowerCase();

        if (normalizedKey === "offset") {
          const offsetMs = Number(value);
          if (!Number.isNaN(offsetMs)) {
            metadata.offsetMs = offsetMs;
          }
          return;
        }

        if (normalizedKey === "ar") {
          metadata.artist = value.trim();
          return;
        }

        if (normalizedKey === "ti") {
          metadata.title = value.trim();
          return;
        }

        if (normalizedKey === "al") {
          metadata.album = value.trim();
          return;
        }

        if (normalizedKey === "by") {
          metadata.by = value.trim();
          return;
        }

        return;
      }

      const timestamps = [...line.matchAll(timestampPattern)];
      if (!timestamps.length) {
        return;
      }

      const text = line.replace(timestampPattern, "").trim();
      timestamps.forEach((match, timestampIndex) => {
        const timeMs = parseTimestamp(match[1], match[2], match[3]);
        if (timeMs === null) {
          return;
        }

        lines.push({
          index: lineIndex * 10 + timestampIndex,
          timeMs,
          text
        });
      });
    });

  const offsetMs = metadata.offsetMs ?? 0;
  const adjustedLines = lines
    .map((line) => ({
      ...line,
      timeMs: Math.max(0, line.timeMs + offsetMs)
    }))
    .sort((left, right) => left.timeMs - right.timeMs || left.index - right.index);

  return {
    metadata,
    lines: adjustedLines
  };
};

export const createLyricsSnapshot = (
  trackId: TrackId,
  content?: string | null,
  source: "lrc" | "embedded" = "lrc"
): LyricsSnapshot => {
  if (!content) {
    return {
      trackId,
      source: "none",
      metadata: {},
      lines: []
    };
  }

  const parsed = parseLrc(content);
  if (!parsed.lines.length) {
    if (source === "embedded") {
      const lines = content
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, index) => ({
          index,
          timeMs: 0,
          text
        }));

      if (lines.length) {
        return {
          trackId,
          source,
          metadata: parsed.metadata,
          lines
        };
      }
    }

    return {
      trackId,
      source: "none",
      metadata: parsed.metadata,
      lines: []
    };
  }

  return {
    trackId,
    source,
    metadata: parsed.metadata,
    lines: parsed.lines
  };
};

export const findActiveLyricLine = (
  lines: readonly LyricLine[],
  positionMs: number
): LyricLine | null => {
  if (!lines.length) {
    return null;
  }

  let activeLine: LyricLine | null = null;
  for (const line of lines) {
    if (line.timeMs > positionMs) {
      break;
    }
    activeLine = line;
  }

  return activeLine;
};

export const getLyricLineByTime = (snapshot: LyricsSnapshot, positionMs: number) =>
  findActiveLyricLine(snapshot.lines, positionMs);

export const isLyricsAvailable = (snapshot: LyricsSnapshot) => snapshot.source !== "none" && snapshot.lines.length > 0;
