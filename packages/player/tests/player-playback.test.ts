import { describe, expect, it } from "vitest";
import {
  advancePlaybackCursor,
  createPlaybackState,
  setDurationSeconds,
  setPlaybackMode,
  setProgressSeconds,
  setVolume,
  startTrackPlayback,
  syncPlaybackToQueue,
  togglePlayback
} from "../src";
import { createQueue } from "../src";
import { createTrackId } from "../src";

describe("player playback", () => {
  it("updates playback state with pure helpers", () => {
    const queue = createQueue({
      trackIds: [1, 2, 3].map((value) => createTrackId(`track-${value}`))
    });
    const initial = createPlaybackState();
    const active = startTrackPlayback(initial, {
      queue,
      progressSeconds: 12,
      durationSeconds: 180
    });

    expect(active.isPlaying).toBe(true);
    expect(active.currentTrackId).toBe(queue.items[0]?.trackId ?? null);
    expect(active.progressSeconds).toBe(12);
    expect(active.durationSeconds).toBe(180);

    const modeChanged = setPlaybackMode(active, "shuffle", 13);
    expect(modeChanged.playbackMode).toBe("shuffle");
    expect(modeChanged.shuffleSeed).toBe(13);

    expect(setVolume(modeChanged, 1.5).volume).toBe(1);
    expect(setProgressSeconds(setDurationSeconds(modeChanged, 120), 500).progressSeconds).toBe(120);
    expect(togglePlayback(modeChanged).isPlaying).toBe(false);
  });

  it("advances and syncs against the queue", () => {
    const queue = createQueue({
      trackIds: [1, 2, 3].map((value) => createTrackId(`track-${value}`)),
      currentTrackId: createTrackId("track-2")
    });
    const state = createPlaybackState({
      currentTrackId: queue.items[1]?.trackId ?? null,
      currentIndex: 1,
      isPlaying: true
    });

    const synced = syncPlaybackToQueue(state, queue);
    expect(synced.currentIndex).toBe(queue.currentIndex);
    expect(synced.currentTrackId).toBe(queue.items[1]?.trackId ?? null);

    const advanced = advancePlaybackCursor(synced, queue, "next");
    expect(advanced.currentIndex).toBe(2);
    expect(advanced.currentTrackId).toBe(queue.items[2]?.trackId ?? null);
    expect(advanced.isPlaying).toBe(true);
  });

  it("prefers the requested track id when starting playback", () => {
    const queue = createQueue({
      trackIds: [1, 2, 3].map((value) => createTrackId(`track-${value}`))
    });
    const targetTrackId = queue.items[2]?.trackId ?? null;
    const state = createPlaybackState();

    const started = startTrackPlayback(state, {
      queue,
      currentTrackId: targetTrackId
    });

    expect(started.currentTrackId).toBe(targetTrackId);
    expect(started.currentIndex).toBe(2);
  });
});
