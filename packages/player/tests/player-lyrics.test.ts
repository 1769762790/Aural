import { describe, expect, it } from "vitest";
import {
  createLyricsSnapshot,
  findActiveLyricLine,
  isLyricsAvailable,
  parseLrc
} from "../src";
import { createTrackId } from "../src";

describe("player lyrics", () => {
  it("parses LRC metadata and timestamps", () => {
    const parsed = parseLrc(`
[ar:Example Artist]
[offset:500]
[00:01.000]hello
[00:02.000][00:03.000]world
`.trim());

    expect(parsed.metadata.artist).toBe("Example Artist");
    expect(parsed.metadata.offsetMs).toBe(500);
    expect(parsed.lines.map((line) => line.text)).toEqual(["hello", "world", "world"]);
    expect(parsed.lines[0]?.timeMs).toBe(1500);
    expect(findActiveLyricLine(parsed.lines, 2100)?.text).toBe("hello");
    expect(findActiveLyricLine(parsed.lines, 3600)?.text).toBe("world");
  });

  it("parses enhanced karaoke timestamps into lyric segments", () => {
    const parsed = parseLrc(`
[00:01.000]<00:01.000>bleeding <00:01.400>me <00:01.800>dry
`.trim());

    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0]?.text).toBe("bleeding me dry");
    expect(parsed.lines[0]?.segments).toEqual([
      {
        text: "bleeding ",
        startMs: 1000,
        endMs: 1400
      },
      {
        text: "me ",
        startMs: 1400,
        endMs: 1800
      },
      {
        text: "dry",
        startMs: 1800,
        endMs: 2600
      }
    ]);
  });

  it("keeps plain lrc lines without karaoke segments", () => {
    const parsed = parseLrc(`[00:01.000]plain line`);

    expect(parsed.lines[0]?.segments).toBeUndefined();
  });

  it("falls back to an empty lyrics snapshot when missing content", () => {
    const trackId = createTrackId("track-void");
    const snapshot = createLyricsSnapshot(trackId, "");

    expect(snapshot.trackId).toBe(trackId);
    expect(snapshot.source).toBe("none");
    expect(snapshot.lines).toEqual([]);
    expect(isLyricsAvailable(snapshot)).toBe(false);
  });

  it("marks embedded synchronized lyrics as available", () => {
    const trackId = createTrackId("track-embedded-synced");
    const snapshot = createLyricsSnapshot(trackId, "[00:01.000]first line\n[00:02.500]second line", "embedded");

    expect(snapshot.source).toBe("embedded");
    expect(snapshot.lines).toHaveLength(2);
    expect(snapshot.lines[0]?.timeMs).toBe(1000);
    expect(isLyricsAvailable(snapshot)).toBe(true);
  });

  it("keeps embedded plain-text lyrics as static lines", () => {
    const trackId = createTrackId("track-embedded-plain");
    const snapshot = createLyricsSnapshot(trackId, "line one\n\nline two", "embedded");

    expect(snapshot.source).toBe("embedded");
    expect(snapshot.lines.map((line) => line.text)).toEqual(["line one", "line two"]);
    expect(snapshot.lines.every((line) => line.timeMs === 0)).toBe(true);
    expect(isLyricsAvailable(snapshot)).toBe(true);
  });

  it("preserves karaoke segments in lyric snapshots", () => {
    const trackId = createTrackId("track-karaoke");
    const snapshot = createLyricsSnapshot(
      trackId,
      "[00:01.000]<00:01.000>bleeding <00:01.400>me <00:01.800>dry"
    );

    expect(snapshot.source).toBe("lrc");
    expect(snapshot.lines[0]?.segments?.length).toBe(3);
    expect(snapshot.lines[0]?.segments?.[1]?.text).toBe("me ");
  });
});
