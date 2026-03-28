import type { PlaybackMode, QueueItem } from "./entities";
import type { QueueId, TrackId } from "./ids";
import { createQueueId } from "./ids";

export interface BuildQueueInput {
  trackIds: TrackId[];
  sourceType: QueueItem["sourceType"];
  sourceId: string;
}

export interface QueueState {
  queueId: QueueId;
  items: QueueItem[];
  currentIndex: number;
  playbackMode: PlaybackMode;
  shuffleSeed: number | null;
}

export const buildQueue = (input: BuildQueueInput): QueueState => {
  const queueId = createQueueId(`${input.sourceType}:${input.sourceId}:${input.trackIds.join("|")}`);
  return {
    queueId,
    currentIndex: 0,
    playbackMode: "queue",
    shuffleSeed: null,
    items: input.trackIds.map((trackId, index) => ({
      id: `${queueId}:${index}`,
      queueId,
      trackId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      position: index
    }))
  };
};

export const reorderQueue = (items: QueueItem[], from: number, to: number) => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return items;
  }

  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, position: index }));
};

export const insertNext = (items: QueueItem[], currentIndex: number, trackIds: TrackId[]) => {
  const next = [...items];
  const insertPosition = currentIndex + 1;
  const queueId = items[0]?.queueId ?? createQueueId(`ad-hoc:${trackIds.join("|")}`);

  next.splice(
    insertPosition,
    0,
    ...trackIds.map((trackId, offset) => ({
      id: `${queueId}:insert:${Date.now()}:${offset}`,
      queueId,
      trackId,
      sourceType: "library" as const,
      sourceId: "library",
      position: insertPosition + offset
    }))
  );

  return next.map((item, index) => ({ ...item, position: index }));
};

export const createShuffledOrder = (length: number, seed: number) => {
  const order = Array.from({ length }, (_, index) => index);
  let randomSeed = seed;

  const random = () => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
};
