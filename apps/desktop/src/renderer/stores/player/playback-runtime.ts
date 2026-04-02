import type { LyricsResponse } from "@aural/contracts";
import type { PlayableItem } from "@aural/domain";
import { resolveNextQueueIndex, startTrackPlayback, type PlaybackState, type QueueState } from "@aural/player";
import { bridge } from "@renderer/lib/bridge";
import {
  applyChannelBalance,
  getActiveDeck,
  getAllDecks,
  getInactiveDeck,
  prepareDeck,
  rampDeckGain,
  resetDeck,
  resolveDurationSeconds,
  resolveElementDurationSeconds,
  resolveFadeTransitionSeconds,
  resolveOutputVolume,
  resumeAudioGraph,
  setActiveDeckId,
  setDeckGainImmediate,
  setOutputGainImmediate,
  type FadeMode,
  type ShuffleStrategy
} from "./audio-graph";

const toPlayerTrackId = (trackId: PlayableItem["id"]) => trackId as never;
const randomIndex = (length: number) => Math.floor(Math.random() * length);

let trackSwitchInFlight = false;
let autoAdvanceTrackId: string | null = null;

export const isTrackSwitchInFlight = () => trackSwitchInFlight;
export const getAutoAdvanceTrackId = () => autoAdvanceTrackId;
export const setAutoAdvanceTrackId = (trackId: string | null) => {
  autoAdvanceTrackId = trackId;
};

export const pickTrueRandomNextIndex = (queue: QueueState, currentIndex: number) => {
  if (!queue.items.length) {
    return -1;
  }

  if (queue.items.length === 1) {
    return 0;
  }

  const candidates = queue.items
    .map((_, index) => index)
    .filter((index) => index !== currentIndex);
  return candidates[randomIndex(candidates.length)] ?? -1;
};

export const canAutoAdvanceWithFade = (
  queue: QueueState | null,
  playbackMode: PlaybackState["playbackMode"],
  shuffleStrategy: ShuffleStrategy
) => {
  if (!queue || !queue.items.length) {
    return false;
  }

  if (playbackMode === "repeat-one") {
    return true;
  }

  if (playbackMode === "shuffle" && shuffleStrategy === "true-random") {
    return queue.items.length > 1;
  }

  return resolveNextQueueIndex(queue, { respectRepeatOne: true }) >= 0;
};

export const resolveAutoAdvanceLeadSeconds = (_fadeMode: FadeMode, transitionSeconds: number) => transitionSeconds;

interface LoadTrackOptions {
  autoplay?: boolean;
  startAtSeconds?: number;
  replayGainEnabled?: boolean;
  replayGainMultiplier?: number;
}

interface LoadTrackResult {
  currentItem: PlayableItem | null;
  lyrics: LyricsResponse | null;
  playback: PlaybackState;
}

const resolvePlaybackAsset = async (item: PlayableItem) => {
  if (item.source === "local" && item.path) {
    return {
      kind: "file" as const,
      path: item.path
    };
  }

  return bridge.online.resolvePlayback(item.id);
};

export const loadTrack = async (
  queue: QueueState,
  playback: PlaybackState,
  itemMap: Record<string, PlayableItem>,
  trackId: string | null,
  isMuted: boolean,
  runtimeDuckActive: boolean,
  runtimeDuckFactor: number,
  channelBalance: number,
  fadeEnabled: boolean,
  fadeMode: FadeMode,
  crossfadeSeconds: number,
  options: LoadTrackOptions = {}
): Promise<LoadTrackResult> => {
  trackSwitchInFlight = true;
  autoAdvanceTrackId = null;
  try {
    if (!trackId) {
      getAllDecks().forEach((deck) => resetDeck(deck, { clearSource: true }));
      setOutputGainImmediate(0);
      return {
        currentItem: null,
        lyrics: null,
        playback: {
          ...playback,
          isPlaying: false
        }
      };
    }

    const currentItem = itemMap[trackId] ?? null;
    if (!currentItem) {
      return {
        currentItem: null,
        lyrics: null,
        playback
      };
    }

    const previousDeck = getActiveDeck();
    const nextDeck = getInactiveDeck();
    const hasActiveSource = Boolean(previousDeck.element.src) && !previousDeck.element.paused;
    const transitionSeconds = resolveFadeTransitionSeconds(fadeEnabled, crossfadeSeconds);
    const autoplay = options.autoplay ?? true;
    const startAtSeconds = Math.max(0, options.startAtSeconds ?? 0);
    const playbackAsset = await resolvePlaybackAsset(currentItem);
    if (!playbackAsset) {
      return {
        currentItem: null,
        lyrics: null,
        playback: {
          ...playback,
          isPlaying: false
        }
      };
    }

    applyChannelBalance(channelBalance);

    await prepareDeck(nextDeck, currentItem, playbackAsset, startAtSeconds, playback.playbackRate, isMuted);
    setOutputGainImmediate(
      resolveOutputVolume(
        playback.volume,
        runtimeDuckActive,
        runtimeDuckFactor,
        options.replayGainEnabled ?? false,
        options.replayGainMultiplier ?? 1
      )
    );

    if (autoplay) {
      await resumeAudioGraph();

      if (hasActiveSource && transitionSeconds > 0) {
        if (fadeMode === "fade") {
          await rampDeckGain(previousDeck, 0, transitionSeconds);
          previousDeck.element.pause();
          previousDeck.element.removeAttribute("src");
          previousDeck.element.load();
          previousDeck.trackId = null;
          setActiveDeckId(nextDeck.id);
          setDeckGainImmediate(nextDeck, 0);
          await nextDeck.element.play();
          void rampDeckGain(nextDeck, 1, transitionSeconds);
        } else {
          setDeckGainImmediate(nextDeck, 0);
          setActiveDeckId(nextDeck.id);
          await nextDeck.element.play();
          await Promise.all([rampDeckGain(previousDeck, 0, transitionSeconds), rampDeckGain(nextDeck, 1, transitionSeconds)]);
          previousDeck.element.pause();
          previousDeck.element.removeAttribute("src");
          previousDeck.element.load();
          previousDeck.trackId = null;
        }
      } else {
        if (hasActiveSource) {
          resetDeck(previousDeck, { clearSource: true });
        }
        setActiveDeckId(nextDeck.id);
        setDeckGainImmediate(nextDeck, transitionSeconds > 0 ? 0 : 1);
        await nextDeck.element.play();
        if (transitionSeconds > 0) {
          void rampDeckGain(nextDeck, 1, transitionSeconds);
        } else {
          setDeckGainImmediate(nextDeck, 1);
        }
      }
      await bridge.collection.recordPlay(currentItem.id, queue.items[queue.currentIndex]?.sourceType, queue.items[queue.currentIndex]?.sourceId);
    } else {
      if (hasActiveSource) {
        resetDeck(previousDeck, { clearSource: true });
      }
      setActiveDeckId(nextDeck.id);
      setDeckGainImmediate(nextDeck, 1);
      nextDeck.element.pause();
    }

    const lyrics = await bridge.lyrics.getLyrics(currentItem.id);
    const nextPlayback = startTrackPlayback(playback, {
      queue,
      currentTrackId: toPlayerTrackId(currentItem.id),
      progressSeconds: nextDeck.element.currentTime,
      durationSeconds: resolveDurationSeconds(currentItem.duration)
    });

    return {
      currentItem,
      lyrics,
      playback: autoplay
        ? nextPlayback
        : {
            ...nextPlayback,
            isPlaying: false,
            progressSeconds: nextDeck.element.currentTime
          }
    };
  } finally {
    trackSwitchInFlight = false;
  }
};
