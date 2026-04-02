import { create } from "zustand";
import type { SettingKey, SettingValue, Track } from "@aural/domain";
import type { LyricsResponse, ReplayGainAnalysis } from "@aural/contracts";
import {
  addNext,
  advancePlaybackCursor,
  createPlaybackState,
  createQueue,
  setDurationSeconds,
  setPlaybackRate,
  setPlaybackMode,
  setQueuePlaybackMode,
  setProgressSeconds,
  setVolume,
  startTrackPlayback,
  type PlaybackState,
  type QueueState
} from "@aural/player";
import { bridge } from "@renderer/lib/bridge";
import {
  applyChannelBalance,
  applyChannelMode,
  applyOutputDevice,
  ensureAudioGraph,
  getActiveAudioElement,
  getAllDecks,
  persistPlayerVolumePreference,
  rampOutputGain,
  resumeAudioGraph,
  resolveCrossfadeSeconds,
  resolveDurationSeconds,
  resolveElementDurationSeconds,
  resolveFadeMode,
  resolveFadeTransitionSeconds,
  resolveOutputVolume,
  resolveShuffleStrategy,
  setActiveDeckId,
  setOutputGainImmediate,
  subscribePlayerSpectrum,
  getPlayerSpectrumFrame,
  type FadeMode,
  type ShuffleStrategy,
  type SpectrumFrame,
  resetDeck
} from "@renderer/stores/player/audio-graph";
import {
  canAutoAdvanceWithFade,
  getAutoAdvanceTrackId,
  isTrackSwitchInFlight,
  loadTrack,
  pickTrueRandomNextIndex,
  resolveAutoAdvanceLeadSeconds,
  setAutoAdvanceTrackId
} from "@renderer/stores/player/playback-runtime";
import { readPersistedSession, writePersistedSession } from "@renderer/stores/player/session";

type DomainTrackId = Track["id"];
const toPlayerTrackId = (trackId: DomainTrackId) => trackId as never;

interface PlayerStoreState {
  queue: QueueState | null;
  playback: PlaybackState;
  trackMap: Record<string, Track>;
  currentTrack: Track | null;
  lyrics: LyricsResponse | null;
  queueOpen: boolean;
  outputDeviceId: string;
  replayGainEnabled: boolean;
  replayGainAnalysis: ReplayGainAnalysis | null;
  replayGainMultiplier: number;
  startupAutoplay: boolean;
  shuffleStrategy: ShuffleStrategy;
  shuffleHistory: number[];
  shuffleFuture: number[];
  channelMode: "stereo" | "mono";
  channelBalance: number;
  fadeEnabled: boolean;
  fadeMode: FadeMode;
  crossfadeSeconds: number;
  isMuted: boolean;
  lastVolumeBeforeMute: number;
  runtimeDuckActive: boolean;
  runtimeDuckFactor: number;
  hydrateAudio: () => void;
  applyPreferences: (preferences: Partial<Record<SettingKey, SettingValue>>) => void;
  playTracks: (tracks: Track[], startTrackId?: DomainTrackId, sourceType?: QueueState["items"][number]["sourceType"], sourceId?: string) => Promise<void>;
  togglePlay: () => Promise<void>;
  playNext: (trigger?: "auto" | "manual") => Promise<void>;
  playPrevious: (trigger?: "auto" | "manual") => Promise<void>;
  seekTo: (seconds: number) => void;
  setVolumeLevel: (volume: number) => void;
  setPlaybackRateLevel: (rate: number) => void;
  toggleMute: () => void;
  setRuntimeDuck: (active: boolean) => void;
  setMode: (mode: PlaybackState["playbackMode"]) => void;
  clearPlayback: () => void;
  syncTrackInState: (track: Track) => void;
  removeTrackFromQueue: (trackId: DomainTrackId) => void;
  toggleQueue: () => void;
  setQueueOpen: (open: boolean) => void;
  addTracksNext: (tracks: Track[]) => void;
  refreshReplayGain: (trackId?: DomainTrackId | null) => Promise<void>;
  persistSession: () => void;
  restoreSession: (options?: { autoplay?: boolean }) => Promise<void>;
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  queue: null,
  playback: createPlaybackState(),
  trackMap: {},
  currentTrack: null,
  lyrics: null,
  queueOpen: false,
  outputDeviceId: "default",
  replayGainEnabled: true,
  replayGainAnalysis: null,
  replayGainMultiplier: 1,
  startupAutoplay: false,
  shuffleStrategy: "anti-repeat",
  shuffleHistory: [],
  shuffleFuture: [],
  channelMode: "stereo",
  channelBalance: 0,
  fadeEnabled: true,
  fadeMode: "crossfade",
  crossfadeSeconds: 1.5,
  isMuted: false,
  lastVolumeBeforeMute: 0.8,
  runtimeDuckActive: false,
  runtimeDuckFactor: 0.35,
  hydrateAudio: () => {
    ensureAudioGraph();
    getAllDecks().forEach((deck) => {
      deck.element.playbackRate = get().playback.playbackRate;
      deck.element.muted = get().isMuted;
    });
    setOutputGainImmediate(
      resolveOutputVolume(
        get().playback.volume,
        get().runtimeDuckActive,
        get().runtimeDuckFactor,
        get().replayGainEnabled,
        get().replayGainMultiplier
      )
    );
    applyChannelMode(get().channelMode);
    applyChannelBalance(get().channelBalance);
    const syncDuration = () => {
      set((state) => ({
        playback: setDurationSeconds(
          state.playback,
          resolveDurationSeconds(state.currentTrack?.duration ?? state.playback.durationSeconds)
        )
      }));
    };

    getAllDecks().forEach((deck) => {
      deck.element.addEventListener("timeupdate", () => {
        if (deck.element !== getActiveAudioElement()) {
          return;
        }

        set((state) => ({
          playback: setProgressSeconds(state.playback, deck.element.currentTime)
        }));
        const state = get();
        const transitionSeconds = resolveFadeTransitionSeconds(state.fadeEnabled, state.crossfadeSeconds);
        const autoAdvanceLeadSeconds = resolveAutoAdvanceLeadSeconds(state.fadeMode, transitionSeconds);
        const remainingSeconds =
          resolveElementDurationSeconds(deck.element, state.currentTrack?.duration ?? state.playback.durationSeconds) - deck.element.currentTime;
        if (
          !isTrackSwitchInFlight() &&
          state.currentTrack &&
          transitionSeconds > 0 &&
          remainingSeconds > 0.05 &&
          remainingSeconds <= autoAdvanceLeadSeconds &&
          getAutoAdvanceTrackId() !== state.currentTrack.id &&
          canAutoAdvanceWithFade(state.queue, state.playback.playbackMode, state.shuffleStrategy)
        ) {
          setAutoAdvanceTrackId(state.currentTrack.id);
          void get().playNext("auto");
        }
        if (Math.floor(deck.element.currentTime * 2) % 2 === 0) {
          get().persistSession();
        }
      });

      deck.element.addEventListener("loadedmetadata", () => {
        if (deck.element === getActiveAudioElement()) {
          syncDuration();
        }
      });
      deck.element.addEventListener("durationchange", () => {
        if (deck.element === getActiveAudioElement()) {
          syncDuration();
        }
      });
      deck.element.addEventListener("canplay", () => {
        if (deck.element === getActiveAudioElement()) {
          syncDuration();
        }
      });

      deck.element.addEventListener("pause", () => {
        if (deck.element !== getActiveAudioElement()) {
          return;
        }
        set((state) => ({
          playback: {
            ...state.playback,
            isPlaying: false
          }
        }));
        get().persistSession();
      });

      deck.element.addEventListener("play", () => {
        if (deck.element !== getActiveAudioElement()) {
          return;
        }
        set((state) => ({
          playback: {
            ...state.playback,
            isPlaying: true
          }
        }));
        get().persistSession();
      });

      deck.element.addEventListener("ended", () => {
        if (deck.element !== getActiveAudioElement() || isTrackSwitchInFlight()) {
          return;
        }
        void get().playNext("auto");
      });
    });
  },
  applyPreferences: (preferences) => {
    const nextVolume = typeof preferences["player.volume"] === "number" ? preferences["player.volume"] : null;
    const nextReplayGainEnabled =
      typeof preferences["player.replayGainEnabled"] === "boolean" ? preferences["player.replayGainEnabled"] : null;
    const nextStartupAutoplay =
      typeof preferences["player.startupAutoplay"] === "boolean" ? preferences["player.startupAutoplay"] : null;
    const nextPlaybackRate = typeof preferences["player.playbackRate"] === "number" ? preferences["player.playbackRate"] : null;
    const nextMode =
      preferences["player.playbackMode"] === "queue" ||
      preferences["player.playbackMode"] === "shuffle" ||
      preferences["player.playbackMode"] === "repeat-one"
        ? preferences["player.playbackMode"]
        : null;
    const nextShuffleStrategy =
      preferences["player.shuffleStrategy"] === "true-random" || preferences["player.shuffleStrategy"] === "anti-repeat"
        ? preferences["player.shuffleStrategy"]
        : null;
    const nextOutputDeviceId =
      typeof preferences["player.outputDeviceId"] === "string" && preferences["player.outputDeviceId"].trim().length
        ? preferences["player.outputDeviceId"].trim()
        : null;
    const nextChannelMode =
      preferences["player.channelMode"] === "mono" || preferences["player.channelMode"] === "stereo"
        ? preferences["player.channelMode"]
        : null;
    const nextChannelBalance = typeof preferences["player.channelBalance"] === "number" ? preferences["player.channelBalance"] : null;
    const nextFadeEnabled = typeof preferences["player.fadeEnabled"] === "boolean" ? preferences["player.fadeEnabled"] : null;
    const nextFadeMode = preferences["player.fadeMode"] ? resolveFadeMode(preferences["player.fadeMode"]) : null;
    const nextCrossfadeSeconds = typeof preferences["player.crossfadeSeconds"] === "number" ? preferences["player.crossfadeSeconds"] : null;

    if (nextPlaybackRate !== null) {
      const clampedRate = Math.min(3, Math.max(0.5, nextPlaybackRate));
      getAllDecks().forEach((deck) => {
        deck.element.playbackRate = clampedRate;
      });
    }
    if (nextOutputDeviceId !== null) {
      void applyOutputDevice(nextOutputDeviceId);
    }
    if (nextChannelMode !== null) {
      applyChannelMode(nextChannelMode);
    }
    if (nextChannelBalance !== null) {
      applyChannelBalance(nextChannelBalance);
    }

    set((state) => {
      const shuffleSeed =
        nextMode === "shuffle"
          ? state.playback.shuffleSeed ?? Math.floor(Math.random() * 100_000)
          : null;
      const volumePlayback = nextVolume !== null ? setVolume(state.playback, nextVolume) : state.playback;
      const speedPlayback = nextPlaybackRate !== null ? setPlaybackRate(volumePlayback, nextPlaybackRate) : volumePlayback;
      const nextPlayback = nextMode ? setPlaybackMode(speedPlayback, nextMode, shuffleSeed) : speedPlayback;
      const replayGainEnabled = nextReplayGainEnabled ?? state.replayGainEnabled;
      const replayGainMultiplier = replayGainEnabled ? state.replayGainMultiplier : 1;

      return {
        playback: nextPlayback,
        outputDeviceId: nextOutputDeviceId ?? state.outputDeviceId,
        replayGainEnabled,
        replayGainAnalysis: replayGainEnabled ? state.replayGainAnalysis : null,
        replayGainMultiplier,
        startupAutoplay: nextStartupAutoplay ?? state.startupAutoplay,
        shuffleStrategy: nextShuffleStrategy ?? state.shuffleStrategy,
        shuffleHistory:
          (nextShuffleStrategy ?? state.shuffleStrategy) === "true-random" &&
          (nextMode ?? state.playback.playbackMode) === "shuffle" &&
          state.queue?.currentIndex !== undefined &&
          state.queue.currentIndex >= 0
            ? [state.queue.currentIndex]
            : state.shuffleHistory,
        shuffleFuture: nextShuffleStrategy === "true-random" ? [] : state.shuffleFuture,
        channelMode: nextChannelMode ?? state.channelMode,
        channelBalance: nextChannelBalance ?? state.channelBalance,
        fadeEnabled: nextFadeEnabled ?? state.fadeEnabled,
        fadeMode: nextFadeMode ?? state.fadeMode,
        crossfadeSeconds: nextCrossfadeSeconds !== null ? resolveCrossfadeSeconds(nextCrossfadeSeconds) : state.crossfadeSeconds,
        isMuted: nextVolume !== null ? nextVolume <= 0 : state.isMuted,
        lastVolumeBeforeMute:
          nextVolume !== null && nextVolume > 0 ? nextVolume : state.lastVolumeBeforeMute,
        queue:
          state.queue && nextMode
            ? setQueuePlaybackMode(state.queue, nextMode, shuffleSeed)
            : state.queue
      };
    });

    const store = get();
    setOutputGainImmediate(
      resolveOutputVolume(
        store.playback.volume,
        store.runtimeDuckActive,
        store.runtimeDuckFactor,
        store.replayGainEnabled,
        store.replayGainMultiplier
      )
    );
    getAllDecks().forEach((deck) => {
      deck.element.muted = store.isMuted;
    });

    if (nextReplayGainEnabled !== null) {
      void store.refreshReplayGain();
    }
  },
  playTracks: async (tracks, startTrackId, sourceType = "library", sourceId = "library") => {
    const shuffleSeed = get().playback.playbackMode === "shuffle" ? Math.floor(Math.random() * 100_000) : null;
    const nextQueue = createQueue({
      trackIds: tracks.map((track) => toPlayerTrackId(track.id)),
      currentTrackId: startTrackId ? toPlayerTrackId(startTrackId) : null,
      sourceType,
      sourceId,
      playbackMode: get().playback.playbackMode,
      shuffleSeed
    });
    const nextTrackMap = Object.fromEntries(tracks.map((track) => [track.id, track]));
    const currentTrackId =
      startTrackId ??
      (nextQueue.currentIndex >= 0 ? (nextQueue.items[nextQueue.currentIndex]?.trackId as unknown as DomainTrackId) : null);
    const nextPlaybackBase = createPlaybackState({
      volume: get().playback.volume,
      playbackRate: get().playback.playbackRate,
      playbackMode: get().playback.playbackMode,
      shuffleSeed
    });
    const optimisticTrack = currentTrackId ? nextTrackMap[currentTrackId] ?? null : null;
    const optimisticPlayback =
      currentTrackId && optimisticTrack
        ? startTrackPlayback(nextPlaybackBase, {
            queue: nextQueue,
            currentTrackId: toPlayerTrackId(optimisticTrack.id),
            durationSeconds: optimisticTrack.duration
          })
        : nextPlaybackBase;

    set({
      queue: nextQueue,
      trackMap: nextTrackMap,
      currentTrack: optimisticTrack,
      lyrics: null,
      playback: optimisticPlayback,
      shuffleHistory:
        get().shuffleStrategy === "true-random" && nextQueue.playbackMode === "shuffle" && nextQueue.currentIndex >= 0
          ? [nextQueue.currentIndex]
          : [],
      shuffleFuture: []
    });

    const loaded = await loadTrack(
      nextQueue,
      nextPlaybackBase,
      nextTrackMap,
      currentTrackId,
      get().isMuted,
      get().runtimeDuckActive,
      get().runtimeDuckFactor,
      get().channelBalance,
      get().fadeEnabled,
      get().fadeMode,
      get().crossfadeSeconds
    );

    set({
      queue: nextQueue,
      trackMap: nextTrackMap,
      currentTrack: loaded.currentTrack,
      lyrics: loaded.lyrics,
      playback: loaded.playback
    });
    void get().refreshReplayGain(loaded.currentTrack?.id ?? null);
    get().persistSession();
  },
  togglePlay: async () => {
    const state = get();
    if (!state.currentTrack) {
      return;
    }

    const activeAudio = getActiveAudioElement();
    if (activeAudio.paused) {
      set((current) => ({
        playback: {
          ...current.playback,
          isPlaying: true
        }
      }));
      try {
        await resumeAudioGraph();
        await activeAudio.play();
      } catch {
        set((current) => ({
          playback: {
            ...current.playback,
            isPlaying: false
          }
        }));
      }
      return;
    }

    set((current) => ({
      playback: {
        ...current.playback,
        isPlaying: false
      }
    }));
    activeAudio.pause();
  },
  playNext: async (trigger = "manual") => {
    const queue = get().queue;
    if (!queue) {
      return;
    }
    const state = get();
    const useTrueRandomShuffle = queue.playbackMode === "shuffle" && state.shuffleStrategy === "true-random";
    let nextPlayback: PlaybackState;
    let nextQueue: QueueState;
    let nextShuffleHistory = state.shuffleHistory;
    let nextShuffleFuture = state.shuffleFuture;

    if (useTrueRandomShuffle) {
      const nextIndex =
        nextShuffleFuture.length > 0
          ? nextShuffleFuture[nextShuffleFuture.length - 1] ?? -1
          : pickTrueRandomNextIndex(queue, queue.currentIndex);
      nextPlayback =
        nextIndex < 0
          ? {
              ...state.playback,
              isPlaying: false,
              progressSeconds: 0
            }
          : {
              ...state.playback,
              currentTrackId: queue.items[nextIndex]?.trackId ?? null,
              currentIndex: nextIndex,
              isPlaying: true,
              progressSeconds: 0,
              playbackMode: queue.playbackMode,
              shuffleSeed: queue.shuffleSeed
            };
      nextQueue = {
        ...queue,
        currentIndex: nextPlayback.currentIndex
      };
      if (nextIndex >= 0) {
        if (nextShuffleFuture.length > 0) {
          nextShuffleFuture = nextShuffleFuture.slice(0, -1);
        } else {
          nextShuffleFuture = [];
        }
        nextShuffleHistory = [...nextShuffleHistory, nextIndex];
      }
    } else {
      nextPlayback = advancePlaybackCursor(state.playback, queue, "next", {
        respectRepeatOne: trigger === "auto"
      });
      nextQueue = {
        ...queue,
        currentIndex: nextPlayback.currentIndex
      };
    }
    if (!nextPlayback.currentTrackId) {
      getAllDecks().forEach((deck) => deck.element.pause());
      set({ queue: nextQueue, playback: nextPlayback, currentTrack: null, lyrics: null });
      get().persistSession();
      return;
    }

    const loaded = await loadTrack(
      nextQueue,
      nextPlayback,
      get().trackMap,
      nextPlayback.currentTrackId as unknown as string,
      get().isMuted,
      get().runtimeDuckActive,
      get().runtimeDuckFactor,
      get().channelBalance,
      get().fadeEnabled,
      get().fadeMode,
      get().crossfadeSeconds
    );
    set({
      queue: nextQueue,
      playback: loaded.playback,
      currentTrack: loaded.currentTrack,
      lyrics: loaded.lyrics,
      shuffleHistory: nextShuffleHistory,
      shuffleFuture: nextShuffleFuture
    });
    void get().refreshReplayGain(loaded.currentTrack?.id ?? null);
    get().persistSession();
  },
  playPrevious: async (trigger = "manual") => {
    const queue = get().queue;
    if (!queue) {
      return;
    }
    const state = get();
    const useTrueRandomShuffle = queue.playbackMode === "shuffle" && state.shuffleStrategy === "true-random";
    let nextPlayback: PlaybackState;
    let nextQueue: QueueState;
    let nextShuffleHistory = state.shuffleHistory;
    let nextShuffleFuture = state.shuffleFuture;

    if (useTrueRandomShuffle && nextShuffleHistory.length > 1) {
      const currentIndex = nextShuffleHistory[nextShuffleHistory.length - 1] ?? queue.currentIndex;
      const previousIndex = nextShuffleHistory[nextShuffleHistory.length - 2] ?? currentIndex;
      nextPlayback = {
        ...state.playback,
        currentTrackId: queue.items[previousIndex]?.trackId ?? null,
        currentIndex: previousIndex,
        isPlaying: true,
        progressSeconds: 0,
        playbackMode: queue.playbackMode,
        shuffleSeed: queue.shuffleSeed
      };
      nextQueue = {
        ...queue,
        currentIndex: previousIndex
      };
      nextShuffleHistory = nextShuffleHistory.slice(0, -1);
      nextShuffleFuture = [...nextShuffleFuture, currentIndex];
    } else {
      nextPlayback = advancePlaybackCursor(state.playback, queue, "previous", {
        respectRepeatOne: trigger === "auto"
      });
      nextQueue = {
        ...queue,
        currentIndex: nextPlayback.currentIndex
      };
    }
    if (!nextPlayback.currentTrackId) {
      getAllDecks().forEach((deck) => deck.element.pause());
      set({ queue: nextQueue, playback: nextPlayback, currentTrack: null, lyrics: null });
      get().persistSession();
      return;
    }

    const loaded = await loadTrack(
      nextQueue,
      nextPlayback,
      get().trackMap,
      nextPlayback.currentTrackId as unknown as string,
      get().isMuted,
      get().runtimeDuckActive,
      get().runtimeDuckFactor,
      get().channelBalance,
      get().fadeEnabled,
      get().fadeMode,
      get().crossfadeSeconds
    );
    set({
      queue: nextQueue,
      playback: loaded.playback,
      currentTrack: loaded.currentTrack,
      lyrics: loaded.lyrics,
      shuffleHistory: nextShuffleHistory,
      shuffleFuture: nextShuffleFuture
    });
    void get().refreshReplayGain(loaded.currentTrack?.id ?? null);
    get().persistSession();
  },
  seekTo: (seconds) => {
    getActiveAudioElement().currentTime = seconds;
    set((state) => ({
      playback: setProgressSeconds(state.playback, seconds)
    }));
    get().persistSession();
  },
  setVolumeLevel: (volume) => {
    const state = get();
    const nextMuted = volume <= 0;
    setOutputGainImmediate(
      resolveOutputVolume(volume, state.runtimeDuckActive, state.runtimeDuckFactor, state.replayGainEnabled, state.replayGainMultiplier)
    );
    getAllDecks().forEach((deck) => {
      deck.element.muted = nextMuted;
    });
    set((state) => ({
      playback: setVolume(state.playback, volume),
      isMuted: nextMuted,
      lastVolumeBeforeMute: volume > 0 ? volume : state.lastVolumeBeforeMute
    }));
    persistPlayerVolumePreference(volume);
    get().persistSession();
  },
  setPlaybackRateLevel: (rate) => {
    const clampedRate = Math.min(3, Math.max(0.5, rate));
    getAllDecks().forEach((deck) => {
      deck.element.playbackRate = clampedRate;
    });
    set((state) => ({
      playback: setPlaybackRate(state.playback, clampedRate)
    }));
    get().persistSession();
  },
  toggleMute: () => {
    set((state) => {
      if (!state.isMuted && state.playback.volume > 0) {
        getAllDecks().forEach((deck) => {
          deck.element.muted = true;
        });
        return {
          isMuted: true,
          lastVolumeBeforeMute: state.playback.volume
        };
      }

      const restoredVolume = state.playback.volume > 0 ? state.playback.volume : Math.max(state.lastVolumeBeforeMute, 0.05);
      getAllDecks().forEach((deck) => {
        deck.element.muted = false;
      });
      setOutputGainImmediate(
        resolveOutputVolume(
          restoredVolume,
          state.runtimeDuckActive,
          state.runtimeDuckFactor,
          state.replayGainEnabled,
          state.replayGainMultiplier
        )
      );
      return {
        playback: setVolume(state.playback, restoredVolume),
        isMuted: false,
        lastVolumeBeforeMute: restoredVolume
      };
    });
    const latestState = get();
    if (!latestState.isMuted) {
      persistPlayerVolumePreference(latestState.playback.volume);
    }
    get().persistSession();
  },
  setRuntimeDuck: (active) => {
    set((state) => {
      const nextActive = Boolean(active);
      if (state.runtimeDuckActive === nextActive) {
        return state;
      }

      if (!state.isMuted) {
        getAllDecks().forEach((deck) => {
          deck.element.muted = false;
        });
        setOutputGainImmediate(
          resolveOutputVolume(
            state.playback.volume,
            nextActive,
            state.runtimeDuckFactor,
            state.replayGainEnabled,
            state.replayGainMultiplier
          )
        );
      }

      return {
        runtimeDuckActive: nextActive
      };
    });
  },
  setMode: (mode) => {
    const seed = mode === "shuffle" ? Math.floor(Math.random() * 100_000) : null;
    set((state) => ({
      playback: setPlaybackMode(state.playback, mode, seed),
      queue: state.queue ? setQueuePlaybackMode(state.queue, mode, seed) : state.queue,
      shuffleHistory:
        mode === "shuffle" &&
        state.shuffleStrategy === "true-random" &&
        state.queue &&
        state.queue.currentIndex >= 0
          ? [state.queue.currentIndex]
          : [],
      shuffleFuture: []
    }));
    get().persistSession();
  },
  clearPlayback: () => {
    getAllDecks().forEach((deck) => resetDeck(deck, { clearSource: true }));
    setActiveDeckId("a");
    setOutputGainImmediate(0);

    set((state) => ({
      queue: null,
      trackMap: {},
      currentTrack: null,
      lyrics: null,
      queueOpen: false,
      replayGainAnalysis: null,
      replayGainMultiplier: 1,
      shuffleHistory: [],
      shuffleFuture: [],
      playback: createPlaybackState({
        volume: state.playback.volume,
        playbackRate: state.playback.playbackRate,
        playbackMode: state.playback.playbackMode,
        shuffleSeed: state.playback.playbackMode === "shuffle" ? state.playback.shuffleSeed : null
      })
    }));
    void writePersistedSession(null);
  },
  syncTrackInState: (track) => {
    set((state) => ({
      trackMap: {
        ...state.trackMap,
        [track.id]: track
      },
      currentTrack: state.currentTrack?.id === track.id ? track : state.currentTrack
    }));
    get().persistSession();
  },
  removeTrackFromQueue: (trackId) => {
    const state = get();
    if (!state.queue) {
      return;
    }

    const removedIndex = state.queue.items.findIndex((item) => item.trackId === trackId);
    if (removedIndex < 0) {
      return;
    }

    const nextTrackMap = { ...state.trackMap };
    delete nextTrackMap[trackId];

    if (state.currentTrack?.id === trackId) {
      set({ trackMap: nextTrackMap });
      get().persistSession();
      return;
    }

    const nextItems = state.queue.items
      .filter((item) => item.trackId !== trackId)
      .map((item, index) => ({
        ...item,
        position: index
      }));

    if (!nextItems.length) {
      set({
        queue: null,
        trackMap: nextTrackMap,
        shuffleHistory: [],
        shuffleFuture: []
      });
      get().persistSession();
      return;
    }

    const nextCurrentIndex =
      removedIndex < state.queue.currentIndex
        ? Math.max(0, state.queue.currentIndex - 1)
        : state.queue.currentIndex;
    const nextQueue = {
      ...state.queue,
      items: nextItems,
      currentIndex: nextCurrentIndex
    };

    set((current) => ({
      queue: nextQueue,
      trackMap: nextTrackMap,
      playback: {
        ...current.playback,
        currentIndex: nextCurrentIndex
      },
      shuffleHistory: [],
      shuffleFuture: []
    }));
    get().persistSession();
  },
  toggleQueue: () => {
    set((state) => ({
      queueOpen: !state.queueOpen
    }));
  },
  setQueueOpen: (open) => {
    set({
      queueOpen: open
    });
  },
  addTracksNext: (tracks) => {
    const queue = get().queue;
    if (!queue) {
      return;
    }
    const nextQueue = addNext(queue, {
      trackIds: tracks.map((track) => toPlayerTrackId(track.id))
    });
    set((state) => ({
      queue: nextQueue,
      trackMap: {
        ...state.trackMap,
        ...Object.fromEntries(tracks.map((track) => [track.id, track]))
      }
    }));
    get().persistSession();
  },
  refreshReplayGain: async (trackId) => {
    const targetTrackId = trackId ?? get().currentTrack?.id ?? null;
    if (!targetTrackId) {
      set({
        replayGainAnalysis: null,
        replayGainMultiplier: 1
      });
      return;
    }

    const current = get();
    if (!current.replayGainEnabled) {
      set({
        replayGainAnalysis: null,
        replayGainMultiplier: 1
      });
      if (!current.isMuted) {
        setOutputGainImmediate(resolveOutputVolume(current.playback.volume, current.runtimeDuckActive, current.runtimeDuckFactor));
      }
      return;
    }

    set({
      replayGainAnalysis: null,
      replayGainMultiplier: 1
    });

    if (!current.isMuted) {
      setOutputGainImmediate(resolveOutputVolume(current.playback.volume, current.runtimeDuckActive, current.runtimeDuckFactor));
    }

    const analysis = await bridge.audio.analyzeReplayGain(targetTrackId);
    const latest = get();
    if (latest.currentTrack?.id !== targetTrackId || !latest.replayGainEnabled) {
      return;
    }

    const nextMultiplier = analysis?.recommendedMultiplier ?? 1;
    set({
      replayGainAnalysis: analysis,
      replayGainMultiplier: nextMultiplier
    });

    if (!latest.isMuted) {
      void rampOutputGain(
        resolveOutputVolume(
          latest.playback.volume,
          latest.runtimeDuckActive,
          latest.runtimeDuckFactor,
          true,
          nextMultiplier
        ),
        0.12
      );
    }
  },
  persistSession: () => {
    const state = get();
    if (!state.queue || !state.currentTrack) {
      void writePersistedSession(null);
      return;
    }

    void writePersistedSession({
      queue: state.queue,
      tracks: Object.values(state.trackMap),
      currentTrackId: state.currentTrack.id,
      progressSeconds: state.playback.progressSeconds,
      playbackMode: state.playback.playbackMode,
      shuffleSeed: state.playback.shuffleSeed,
      shuffleHistory: state.shuffleHistory,
      shuffleFuture: state.shuffleFuture
    });
  },
  restoreSession: async (options = {}) => {
    const session = await readPersistedSession();
    if (!session) {
      return;
    }

    const trackMap = Object.fromEntries(session.tracks.map((track) => [track.id, track]));
    const currentTrack = session.currentTrackId ? trackMap[session.currentTrackId] ?? null : null;
    if (!currentTrack) {
      void writePersistedSession(null);
      return;
    }

    const autoplay = options.autoplay ?? false;
    const nextPlaybackBase = createPlaybackState({
      queueId: session.queue.queueId,
      currentTrackId: toPlayerTrackId(currentTrack.id),
      currentIndex: session.queue.currentIndex,
      volume: get().playback.volume,
      playbackRate: get().playback.playbackRate,
      playbackMode: session.playbackMode,
      shuffleSeed: session.shuffleSeed
    });

    set({
      queue: session.queue,
      trackMap,
      currentTrack,
      lyrics: null,
      playback: {
        ...startTrackPlayback(nextPlaybackBase, {
          queue: session.queue,
          currentTrackId: toPlayerTrackId(currentTrack.id),
          progressSeconds: session.progressSeconds,
          durationSeconds: currentTrack.duration
        }),
        isPlaying: autoplay,
        progressSeconds: session.progressSeconds
      },
      shuffleHistory: session.shuffleHistory,
      shuffleFuture: session.shuffleFuture
    });

    const loaded = await loadTrack(
      session.queue,
      nextPlaybackBase,
      trackMap,
      currentTrack.id,
      get().isMuted,
      get().runtimeDuckActive,
      get().runtimeDuckFactor,
      get().channelBalance,
      get().fadeEnabled,
      get().fadeMode,
      get().crossfadeSeconds,
      {
        autoplay,
        startAtSeconds: session.progressSeconds,
        replayGainEnabled: get().replayGainEnabled,
        replayGainMultiplier: get().replayGainMultiplier
      }
    );

    set({
      queue: session.queue,
      trackMap,
      currentTrack: loaded.currentTrack,
      lyrics: loaded.lyrics,
      playback: loaded.playback,
      shuffleHistory: session.shuffleHistory,
      shuffleFuture: session.shuffleFuture
    });
    void get().refreshReplayGain(loaded.currentTrack?.id ?? null);
    get().persistSession();
  }
}));

export type PlayerSpectrumFrame = SpectrumFrame;
export { getPlayerSpectrumFrame, subscribePlayerSpectrum };
