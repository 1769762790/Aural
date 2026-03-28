import type { PlaybackMode, QueueItem, QueueId, QueueState, TrackId } from "./types";
import { createQueueId } from "./types";

export interface CreateQueueInput {
  trackIds: readonly TrackId[];
  sourceType?: QueueItem["sourceType"];
  sourceId?: string;
  currentTrackId?: TrackId | null;
  playbackMode?: PlaybackMode;
  shuffleSeed?: number | null;
}

export interface QueueRepairInput {
  availableTrackIds?: ReadonlySet<TrackId>;
  trackIdMap?: ReadonlyMap<TrackId, TrackId> | Record<string, string>;
  dropMissing?: boolean;
}

export interface QueueInsertInput {
  trackIds: readonly TrackId[];
  sourceType?: QueueItem["sourceType"];
  sourceId?: string;
}

const defaultSourceType: QueueItem["sourceType"] = "library";
const defaultSourceId = "library";

const normalizeTrackIdMap = (
  trackIdMap: QueueRepairInput["trackIdMap"]
): ReadonlyMap<TrackId, TrackId> => {
  if (!trackIdMap) {
    return new Map();
  }

  if (trackIdMap instanceof Map) {
    return trackIdMap;
  }

  return new Map(
    Object.entries(trackIdMap).map(([key, value]) => [key as TrackId, value as TrackId])
  );
};

const createQueueItems = (
  queueId: QueueId,
  trackIds: readonly TrackId[],
  sourceType: QueueItem["sourceType"],
  sourceId: string,
  seedOffset = 0,
  positionOffset = 0
) =>
  trackIds.map((trackId, index) => ({
    id: `${queueId}:${seedOffset + index}`,
    queueId,
    trackId,
    sourceType,
    sourceId,
    position: positionOffset + index
  }));

const reindexItems = (items: QueueItem[]): QueueItem[] =>
  items.map((item, index) => ({
    ...item,
    position: index
  }));

const resolveCurrentIndex = (
  items: QueueItem[],
  currentItemId: string | null,
  fallbackIndex: number
) => {
  if (!items.length) {
    return -1;
  }

  if (!currentItemId) {
    return fallbackIndex >= 0 ? Math.min(fallbackIndex, items.length - 1) : 0;
  }

  const index = items.findIndex((item) => item.id === currentItemId);
  if (index >= 0) {
    return index;
  }

  return fallbackIndex >= 0 ? Math.min(fallbackIndex, items.length - 1) : 0;
};

export const createQueue = (input: CreateQueueInput): QueueState => {
  const trackIds = [...input.trackIds];
  const sourceType = input.sourceType ?? defaultSourceType;
  const sourceId = input.sourceId ?? defaultSourceId;
  const queueId = createQueueId(`${sourceType}:${sourceId}:${trackIds.join("|")}`);
  const items = createQueueItems(queueId, trackIds, sourceType, sourceId, 0, 0);
  const currentIndex = input.currentTrackId
    ? items.findIndex((item) => item.trackId === input.currentTrackId)
    : items.length > 0
      ? 0
      : -1;

  return {
    queueId,
    items,
    currentIndex: currentIndex >= 0 ? currentIndex : items.length > 0 ? 0 : -1,
    playbackMode: input.playbackMode ?? "queue",
    shuffleSeed: input.shuffleSeed ?? null,
    itemSeed: trackIds.length
  };
};

export const createQueuePlaybackOrder = (queue: QueueState): number[] => {
  const order = queue.items.map((_, index) => index);

  if (queue.playbackMode !== "shuffle" || queue.shuffleSeed === null || order.length <= 1) {
    return order;
  }

  let seed = queue.shuffleSeed;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
};

export const resolveNextQueueIndex = (
  queue: QueueState,
  options: { respectRepeatOne?: boolean } = {}
): number => {
  const respectRepeatOne = options.respectRepeatOne ?? true;
  if (!queue.items.length) {
    return -1;
  }

  const order = createQueuePlaybackOrder(queue);
  if (!order.length) {
    return -1;
  }

  if (queue.currentIndex < 0) {
    return order[0] ?? -1;
  }

  const currentOrderIndex = order.indexOf(queue.currentIndex);
  if (currentOrderIndex < 0) {
    return order[0] ?? -1;
  }

  if (queue.playbackMode === "repeat-one" && respectRepeatOne) {
    return queue.currentIndex;
  }

  const nextOrderIndex = currentOrderIndex + 1;
  if (nextOrderIndex < order.length) {
    return order[nextOrderIndex] ?? -1;
  }

  return queue.playbackMode === "shuffle" ? order[0] ?? -1 : -1;
};

export const resolvePreviousQueueIndex = (
  queue: QueueState,
  options: { respectRepeatOne?: boolean } = {}
): number => {
  const respectRepeatOne = options.respectRepeatOne ?? true;
  if (!queue.items.length) {
    return -1;
  }

  const order = createQueuePlaybackOrder(queue);
  if (!order.length) {
    return -1;
  }

  if (queue.currentIndex < 0) {
    return order[0] ?? -1;
  }

  const currentOrderIndex = order.indexOf(queue.currentIndex);
  if (currentOrderIndex < 0) {
    return order[0] ?? -1;
  }

  if (queue.playbackMode === "repeat-one" && respectRepeatOne) {
    return queue.currentIndex;
  }

  const previousOrderIndex = currentOrderIndex - 1;
  if (previousOrderIndex >= 0) {
    return order[previousOrderIndex] ?? -1;
  }

  return queue.playbackMode === "shuffle"
    ? order[order.length - 1] ?? -1
    : queue.currentIndex;
};

export const addNext = (queue: QueueState, input: QueueInsertInput): QueueState => {
  const sourceType = input.sourceType ?? defaultSourceType;
  const sourceId = input.sourceId ?? defaultSourceId;
  const insertionIndex = queue.currentIndex < 0 ? queue.items.length : queue.currentIndex + 1;
  const insertQueueId = queue.queueId;
  const nextItems = [...queue.items];
  const insertedItems = createQueueItems(
    insertQueueId,
    input.trackIds,
    sourceType,
    sourceId,
    queue.itemSeed,
    insertionIndex
  );

  nextItems.splice(insertionIndex, 0, ...insertedItems);

  return {
    ...queue,
    items: reindexItems(nextItems),
    itemSeed: queue.itemSeed + insertedItems.length,
    currentIndex:
      queue.currentIndex < 0
        ? insertedItems.length > 0
          ? 0
          : -1
        : queue.currentIndex
  };
};

export const removeItems = (queue: QueueState, trackIds: readonly TrackId[]): QueueState => {
  if (!trackIds.length || !queue.items.length) {
    return queue;
  }

  const removals = new Set(trackIds);
  const currentItem = queue.currentIndex >= 0 ? queue.items[queue.currentIndex] ?? null : null;
  const fallbackIndex = currentItem ? queue.currentIndex : -1;
  const nextItems = queue.items.filter((item) => !removals.has(item.trackId));
  const reindexedItems = reindexItems(nextItems);
  const currentIndex = resolveCurrentIndex(reindexedItems, currentItem?.id ?? null, fallbackIndex);

  return {
    ...queue,
    items: reindexedItems,
    currentIndex
  };
};

export const reorderQueue = (
  queue: QueueState,
  fromIndex: number,
  toIndex: number
): QueueState => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= queue.items.length ||
    toIndex >= queue.items.length ||
    fromIndex === toIndex
  ) {
    return queue;
  }

  const currentItem = queue.currentIndex >= 0 ? queue.items[queue.currentIndex] ?? null : null;
  const fallbackIndex = currentItem ? queue.currentIndex : -1;
  const nextItems = [...queue.items];
  const [moved] = nextItems.splice(fromIndex, 1);
  if (!moved) {
    return queue;
  }

  nextItems.splice(toIndex, 0, moved);
  const reindexedItems = reindexItems(nextItems);
  const currentIndex = resolveCurrentIndex(reindexedItems, currentItem?.id ?? null, fallbackIndex);

  return {
    ...queue,
    items: reindexedItems,
    currentIndex
  };
};

export const clearQueue = (queue: QueueState): QueueState => ({
  ...queue,
  items: [],
  currentIndex: -1
});

export const repairReferences = (
  queue: QueueState,
  input: QueueRepairInput = {}
): QueueState => {
  if (!queue.items.length) {
    return queue;
  }

  const trackIdMap = normalizeTrackIdMap(input.trackIdMap);
  const availableTrackIds = input.availableTrackIds;
  const currentItem = queue.currentIndex >= 0 ? queue.items[queue.currentIndex] ?? null : null;
  const fallbackIndex = currentItem ? queue.currentIndex : -1;
  const repairedItems = queue.items
    .map((item) => {
      const mappedTrackId = trackIdMap.get(item.trackId) ?? item.trackId;
      const isAvailable = availableTrackIds ? availableTrackIds.has(mappedTrackId) : true;

      if (!isAvailable && input.dropMissing !== false) {
        return null;
      }

      return {
        ...item,
        trackId: mappedTrackId
      };
    })
    .filter((item): item is QueueItem => item !== null);

  const reindexedItems = reindexItems(repairedItems);
  const currentIndex = resolveCurrentIndex(reindexedItems, currentItem?.id ?? null, fallbackIndex);

  return {
    ...queue,
    items: reindexedItems,
    currentIndex
  };
};

export const setQueuePlaybackMode = (
  queue: QueueState,
  playbackMode: PlaybackMode,
  shuffleSeed: number | null = queue.shuffleSeed
): QueueState => ({
  ...queue,
  playbackMode,
  shuffleSeed: playbackMode === "shuffle" ? shuffleSeed : queue.shuffleSeed
});
