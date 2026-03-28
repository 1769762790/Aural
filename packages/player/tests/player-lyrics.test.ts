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
});
