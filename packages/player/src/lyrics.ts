import type { TrackId } from "./types";

export interface LyricLine {
  index: number;
  timeMs: number;
  text: string;
  segments?: LyricSegment[];
}

export interface LyricSegment {
  text: string;
  startMs: number;
  endMs: number;
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
const segmentTimestampPattern = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;

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

      const timestamps = [...rawLine.matchAll(timestampPattern)];
      const lineBody = rawLine.replace(timestampPattern, "");
      const segmentMatches = [...lineBody.matchAll(segmentTimestampPattern)];
      if (!timestamps.length && !segmentMatches.length) {
        return;
      }

      const parsedSegments =
        segmentMatches.length > 0
          ? segmentMatches
              .map((match, index) => {
                const startMs = parseTimestamp(match[1], match[2], match[3]);
                if (startMs === null) {
                  return null;
                }

                const segmentStart = (match.index ?? 0) + match[0].length;
                const nextMarkerIndex =
                  index < segmentMatches.length - 1
                    ? (segmentMatches[index + 1]?.index ?? lineBody.length)
                    : lineBody.length;
                const text = lineBody.slice(segmentStart, nextMarkerIndex);

                return {
                  startMs,
                  text
                };
              })
              .filter(
                (
                  segment
                ): segment is {
                  startMs: number;
                  text: string;
                } => Boolean(segment && segment.text.length)
              )
          : [];

      const plainText =
        parsedSegments.length > 0
          ? parsedSegments.map((segment) => segment.text).join("").trim()
          : lineBody.replace(segmentTimestampPattern, "").trim();

      const lineTimes =
        timestamps.length > 0
          ? timestamps
              .map((match) => parseTimestamp(match[1], match[2], match[3]))
              .filter((timeMs): timeMs is number => timeMs !== null)
          : parsedSegments.length > 0
            ? [parsedSegments[0]!.startMs]
            : [];

      lineTimes.forEach((timeMs, timestampIndex) => {
        lines.push({
          index: lineIndex * 10 + timestampIndex,
          timeMs,
          text: plainText,
          segments:
            parsedSegments.length > 0
              ? parsedSegments.map((segment) => ({
                  text: segment.text,
                  startMs: segment.startMs,
                  endMs: segment.startMs
                }))
              : undefined
        });
      });
    });

  const offsetMs = metadata.offsetMs ?? 0;
  const adjustedLines = lines
    .map((line) => ({
      ...line,
      timeMs: Math.max(0, line.timeMs + offsetMs),
      segments: line.segments?.map((segment) => ({
        ...segment,
        startMs: Math.max(0, segment.startMs + offsetMs),
        endMs: Math.max(0, segment.endMs + offsetMs)
      }))
    }))
    .sort((left, right) => left.timeMs - right.timeMs || left.index - right.index);

  const finalizedLines = adjustedLines.map((line, lineIndex) => {
    if (!line.segments?.length) {
      return line;
    }

    const nextLineStart = adjustedLines[lineIndex + 1]?.timeMs ?? null;
    const finalizedSegments = line.segments.map((segment, segmentIndex) => {
      const nextSegmentStart = line.segments?.[segmentIndex + 1]?.startMs ?? null;
      const resolvedEndMs =
        nextSegmentStart ??
        nextLineStart ??
        segment.startMs + 800;

      return {
        ...segment,
        endMs: Math.max(segment.startMs + 1, resolvedEndMs)
      };
    });

    return {
      ...line,
      segments: finalizedSegments
    };
  });

  return {
    metadata,
    lines: finalizedLines
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
