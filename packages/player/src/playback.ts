import type { PlaybackMode, PlaybackState, QueueState, TrackId } from "./types";
import { resolveNextQueueIndex, resolvePreviousQueueIndex } from "./queue";

export interface CreatePlaybackStateInput {
  queueId?: PlaybackState["queueId"];
  currentTrackId?: TrackId | null;
  currentIndex?: number;
  isPlaying?: boolean;
  progressSeconds?: number;
  durationSeconds?: number;
  volume?: number;
  playbackRate?: number;
  playbackMode?: PlaybackMode;
  shuffleSeed?: number | null;
}

export interface PlaybackTrackContext {
  queue: QueueState;
  currentTrackId?: TrackId | null;
  progressSeconds?: number;
  durationSeconds?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createPlaybackState = (
  input: CreatePlaybackStateInput = {}
): PlaybackState => ({
  queueId: input.queueId ?? null,
  currentTrackId: input.currentTrackId ?? null,
  currentIndex: input.currentIndex ?? -1,
  isPlaying: input.isPlaying ?? false,
  progressSeconds: Math.max(0, input.progressSeconds ?? 0),
  durationSeconds: Math.max(0, input.durationSeconds ?? 0),
  volume: clamp(input.volume ?? 0.8, 0, 1),
  playbackRate: clamp(input.playbackRate ?? 1, 0.5, 3),
  playbackMode: input.playbackMode ?? "queue",
  shuffleSeed: input.shuffleSeed ?? null
});

export const setPlaybackMode = (
  state: PlaybackState,
  playbackMode: PlaybackMode,
  shuffleSeed: number | null = state.shuffleSeed
): PlaybackState => ({
  ...state,
  playbackMode,
  shuffleSeed: playbackMode === "shuffle" ? shuffleSeed : state.shuffleSeed
});

export const togglePlayback = (state: PlaybackState): PlaybackState => ({
  ...state,
  isPlaying: !state.isPlaying
});

export const setProgressSeconds = (
  state: PlaybackState,
  progressSeconds: number
): PlaybackState => ({
  ...state,
  progressSeconds: clamp(progressSeconds, 0, state.durationSeconds || progressSeconds)
});

export const setDurationSeconds = (
  state: PlaybackState,
  durationSeconds: number
): PlaybackState => ({
  ...state,
  durationSeconds: Math.max(0, durationSeconds),
  progressSeconds: Math.min(state.progressSeconds, Math.max(0, durationSeconds))
});

export const setVolume = (state: PlaybackState, volume: number): PlaybackState => ({
  ...state,
  volume: clamp(volume, 0, 1)
});

export const setPlaybackRate = (
  state: PlaybackState,
  playbackRate: number
): PlaybackState => ({
  ...state,
  playbackRate: clamp(playbackRate, 0.5, 3)
});

export const syncPlaybackToQueue = (
  state: PlaybackState,
  queue: QueueState,
  currentTrackId: TrackId | null = queue.currentIndex >= 0 ? queue.items[queue.currentIndex]?.trackId ?? null : null
): PlaybackState => {
  const currentIndex = queue.currentIndex;

  return {
    ...state,
    queueId: queue.queueId,
    currentTrackId,
    currentIndex,
    playbackMode: queue.playbackMode,
    shuffleSeed: queue.shuffleSeed
  };
};

export const startTrackPlayback = (
  state: PlaybackState,
  context: PlaybackTrackContext
): PlaybackState => {
  const resolvedTrackId =
    context.currentTrackId ??
    (context.queue.currentIndex >= 0 ? context.queue.items[context.queue.currentIndex]?.trackId ?? null : null);
  const currentIndex = resolvedTrackId
    ? context.queue.items.findIndex((item) => item.trackId === resolvedTrackId)
    : context.queue.currentIndex;
  const currentTrackId =
    resolvedTrackId ??
    (currentIndex >= 0 ? context.queue.items[currentIndex]?.trackId ?? null : null);

  return {
    ...state,
    queueId: context.queue.queueId,
    currentTrackId,
    currentIndex: currentIndex >= 0 ? currentIndex : context.queue.currentIndex,
    isPlaying: true,
    progressSeconds: Math.max(0, context.progressSeconds ?? 0),
    durationSeconds: Math.max(0, context.durationSeconds ?? state.durationSeconds),
    playbackMode: context.queue.playbackMode,
    shuffleSeed: context.queue.shuffleSeed
  };
};

export const stopPlayback = (state: PlaybackState): PlaybackState => ({
  ...state,
  isPlaying: false,
  progressSeconds: 0
});

export const advancePlaybackCursor = (
  state: PlaybackState,
  queue: QueueState,
  direction: "next" | "previous",
  options: { respectRepeatOne?: boolean } = {}
): PlaybackState => {
  const nextIndex =
    direction === "next"
      ? resolveNextQueueIndex(queue, options)
      : resolvePreviousQueueIndex(queue, options);

  if (nextIndex < 0) {
    return stopPlayback({
      ...state,
      queueId: queue.queueId,
      playbackMode: queue.playbackMode,
      shuffleSeed: queue.shuffleSeed
    });
  }

  const currentTrackId = queue.items[nextIndex]?.trackId ?? null;

  return {
    ...state,
    queueId: queue.queueId,
    currentTrackId,
    currentIndex: nextIndex,
    isPlaying: true,
    progressSeconds: 0,
    playbackMode: queue.playbackMode,
    shuffleSeed: queue.shuffleSeed
  };
};

export const hasActiveTrack = (state: PlaybackState): boolean => Boolean(state.currentTrackId);

export const currentPlaybackProgress = (state: PlaybackState): number => {
  if (state.durationSeconds <= 0) {
    return 0;
  }

  return clamp(state.progressSeconds / state.durationSeconds, 0, 1);
};
