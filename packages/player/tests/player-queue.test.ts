import { describe, expect, it } from "vitest";
import {
  addNext,
  clearQueue,
  createQueue,
  createQueuePlaybackOrder,
  removeItems,
  reorderQueue,
  repairReferences,
  setQueuePlaybackMode
} from "../src";
import { createTrackId } from "../src";

const trackIds = [1, 2, 3, 4].map((value) => createTrackId(`track-${value}`));

describe("player queue", () => {
  it("creates, inserts next, removes, reorders, and clears", () => {
    const queue = createQueue({
      trackIds: trackIds.slice(0, 3),
      currentTrackId: trackIds[1]
    });

    expect(queue.currentIndex).toBe(1);
    expect(queue.items.map((item) => item.trackId)).toEqual(trackIds.slice(0, 3));

    const withNext = addNext(queue, {
      trackIds: [trackIds[3]]
    });

    expect(withNext.items.map((item) => item.trackId)).toEqual([
      trackIds[0],
      trackIds[1],
      trackIds[3],
      trackIds[2]
    ]);
    expect(withNext.currentIndex).toBe(1);

    const withoutCurrent = removeItems(withNext, [trackIds[1]]);
    expect(withoutCurrent.items.map((item) => item.trackId)).toEqual([
      trackIds[0],
      trackIds[3],
      trackIds[2]
    ]);
    expect(withoutCurrent.currentIndex).toBe(1);
    expect(withoutCurrent.items[withoutCurrent.currentIndex]?.trackId).toBe(trackIds[3]);

    const reordered = reorderQueue(withoutCurrent, 0, 2);
    expect(reordered.items.map((item) => item.trackId)).toEqual([
      trackIds[3],
      trackIds[2],
      trackIds[0]
    ]);
    expect(reordered.items[reordered.currentIndex]?.trackId).toBe(trackIds[3]);

    expect(clearQueue(reordered).items).toEqual([]);
  });

  it("repairs missing and remapped references", () => {
    const queue = createQueue({
      trackIds: trackIds.slice(0, 4),
      currentTrackId: trackIds[2]
    });

    const repaired = repairReferences(queue, {
      trackIdMap: new Map([[trackIds[1], trackIds[3]]]),
      availableTrackIds: new Set([trackIds[0], trackIds[2], trackIds[3]]),
      dropMissing: true
    });

    expect(repaired.items.map((item) => item.trackId)).toEqual([
      trackIds[0],
      trackIds[3],
      trackIds[2],
      trackIds[3]
    ]);
    expect(repaired.currentIndex).toBe(2);
  });

  it("keeps shuffle order deterministic by seed", () => {
    const queueA = setQueuePlaybackMode(
      createQueue({ trackIds: trackIds.slice(0, 4) }),
      "shuffle",
      42
    );
    const queueB = setQueuePlaybackMode(
      createQueue({ trackIds: trackIds.slice(0, 4) }),
      "shuffle",
      42
    );
    const queueC = setQueuePlaybackMode(
      createQueue({ trackIds: trackIds.slice(0, 4) }),
      "shuffle",
      7
    );

    expect(createQueuePlaybackOrder(queueA)).toEqual(createQueuePlaybackOrder(queueB));
    expect(createQueuePlaybackOrder(queueA)).not.toEqual(createQueuePlaybackOrder(queueC));
  });
});
