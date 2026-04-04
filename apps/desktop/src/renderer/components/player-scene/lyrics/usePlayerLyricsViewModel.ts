import { useMemo } from "react";
import type { LyricsResponse } from "@aural/contracts";
import type { PlayerLyricsViewModel } from "../playerScene.types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolveKaraokeState = (
  line: LyricsResponse["lines"][number],
  progressMs: number,
  isActive: boolean
) => {
  if (!isActive || !line.segments?.length) {
    return {
      isKaraoke: false,
      karaokeProgress: 0,
      activeSegmentIndex: -1
    };
  }

  const totalLength = line.segments.reduce((sum, segment) => sum + Math.max(segment.text.length, 0), 0);
  if (totalLength <= 0) {
    return {
      isKaraoke: true,
      karaokeProgress: 0,
      activeSegmentIndex: -1
    };
  }

  let completedLength = 0;
  let activeSegmentIndex = -1;

  line.segments.forEach((segment, segmentIndex) => {
    const segmentLength = Math.max(segment.text.length, 0);
    if (progressMs >= segment.endMs) {
      completedLength += segmentLength;
      return;
    }

    if (progressMs >= segment.startMs && activeSegmentIndex === -1) {
      const duration = Math.max(segment.endMs - segment.startMs, 1);
      const ratio = clamp((progressMs - segment.startMs) / duration, 0, 1);
      completedLength += segmentLength * ratio;
      activeSegmentIndex = segmentIndex;
    }
  });

  return {
    isKaraoke: true,
    karaokeProgress: clamp(completedLength / totalLength, 0, 1),
    activeSegmentIndex
  };
};

export const usePlayerLyricsViewModel = (
  lyrics: LyricsResponse | null,
  progressSeconds: number,
  lyricsEnabled: boolean
): PlayerLyricsViewModel => {
  return useMemo(() => {
    if (!lyricsEnabled) {
      return {
        mode: "disabled",
        activeLyricIndex: -1,
        anchorIndex: 0,
        visibleLines: [],
        hasStaticEmbeddedLyrics: false
      };
    }

    if (!lyrics?.lines.length) {
      return {
        mode: "empty",
        activeLyricIndex: -1,
        anchorIndex: 0,
        visibleLines: [],
        hasStaticEmbeddedLyrics: false
      };
    }

    const hasStaticEmbeddedLyrics =
      lyrics.source === "embedded" &&
      lyrics.lines.length > 0 &&
      lyrics.lines.every((line) => line.at === 0);

    if (hasStaticEmbeddedLyrics) {
      return {
        mode: "static",
        activeLyricIndex: -1,
        anchorIndex: 0,
        visibleLines: lyrics.lines.map((line, absoluteIndex) => ({
          ...line,
          absoluteIndex,
          isKaraoke: false,
          karaokeProgress: 0,
          activeSegmentIndex: -1
        })),
        hasStaticEmbeddedLyrics
      };
    }

    let activeLyricIndex = -1;
    const progressMs = progressSeconds * 1000;

    for (let index = lyrics.lines.length - 1; index >= 0; index -= 1) {
      if (lyrics.lines[index]!.at <= progressMs) {
        activeLyricIndex = index;
        break;
      }
    }

    const anchorIndex = activeLyricIndex >= 0 ? activeLyricIndex : 0;
    const start = Math.max(0, anchorIndex - 5);
    const end = Math.min(lyrics.lines.length, anchorIndex + 5);

    return {
      mode: "timed",
      activeLyricIndex,
      anchorIndex,
      visibleLines: lyrics.lines.slice(start, end).map((line, index) => ({
        ...line,
        absoluteIndex: start + index,
        ...resolveKaraokeState(line, progressMs, start + index === activeLyricIndex)
      })),
      hasStaticEmbeddedLyrics
    };
  }, [lyrics, lyricsEnabled, progressSeconds]);
};
