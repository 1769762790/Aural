import { create } from "zustand";
import type { SettingKey, SettingValue, Track } from "@aural/domain";
import type { LyricsResponse, ReplayGainAnalysis } from "@aural/contracts";
import {
  addNext,
  advancePlaybackCursor,
  createPlaybackState,
  createQueue,
  resolveNextQueueIndex,
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
import { toFileUrl } from "@renderer/lib/fileUrl";

type DeckId = "a" | "b";
type AudioDeck = {
  id: DeckId;
  element: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode | null;
  gainNode: GainNode | null;
  trackId: string | null;
};

const createAudioDeck = (id: DeckId): AudioDeck => {
  const element = new Audio();
  element.preload = "metadata";
  element.volume = 1;
  return {
    id,
    element,
    sourceNode: null,
    gainNode: null,
    trackId: null
  };
};

const decks: Record<DeckId, AudioDeck> = {
  a: createAudioDeck("a"),
  b: createAudioDeck("b")
};

let activeDeckId: DeckId = "a";
const PLAYER_SESSION_KEY = "aural.player.session.v1";

type DomainTrackId = Track["id"];
type ShuffleStrategy = "true-random" | "anti-repeat";
type FadeMode = "fade" | "crossfade";
type PersistedPlayerSession = {
  queue: QueueState;
  tracks: Track[];
  currentTrackId: string | null;
  progressSeconds: number;
  playbackMode: PlaybackState["playbackMode"];
  shuffleSeed: number | null;
  shuffleHistory: number[];
  shuffleFuture: number[];
};

const toPlayerTrackId = (trackId: DomainTrackId) => trackId as never;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getActiveDeck = () => decks[activeDeckId];
const getInactiveDeck = () => decks[activeDeckId === "a" ? "b" : "a"];
const getActiveAudioElement = () => getActiveDeck().element;
const resolveElementDurationSeconds = (element: HTMLAudioElement, fallbackSeconds = 0) =>
  Number.isFinite(element.duration) && element.duration > 0 ? element.duration : Math.max(0, fallbackSeconds);
const resolveDurationSeconds = (fallbackSeconds = 0) =>
  resolveElementDurationSeconds(getActiveAudioElement(), fallbackSeconds);
const resolveReplayGainMultiplier = (enabled: boolean, multiplier: number) =>
  enabled ? clamp(Number.isFinite(multiplier) ? multiplier : 1, 0.05, 8) : 1;
const resolveOutputVolume = (
  volume: number,
  duckActive: boolean,
  duckFactor: number,
  replayGainEnabled = false,
  replayGainMultiplier = 1
) => Math.max(0, Math.min(1, volume * (duckActive ? duckFactor : 1) * resolveReplayGainMultiplier(replayGainEnabled, replayGainMultiplier)));
const resolveCrossfadeSeconds = (value: number) => clamp(Number.isFinite(value) ? value : 0, 0, 5);
const resolveFadeTransitionSeconds = (enabled: boolean, value: number) => (enabled ? resolveCrossfadeSeconds(value) : 0);
const resolveFadeMode = (value: unknown): FadeMode => (value === "fade" ? "fade" : "crossfade");
const resolveBalancePan = (value: number) => clamp((Number.isFinite(value) ? value : 0) / 100, -1, 1);
const resolveShuffleStrategy = (value: unknown): ShuffleStrategy =>
  value === "true-random" ? "true-random" : "anti-repeat";
const randomIndex = (length: number) => Math.floor(Math.random() * length);
const readPersistedSession = (): PersistedPlayerSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedPlayerSession> | null;
    if (!parsed?.queue || !Array.isArray(parsed.tracks) || !parsed.tracks.length) {
      return null;
    }

    return {
      queue: parsed.queue,
      tracks: parsed.tracks,
      currentTrackId: typeof parsed.currentTrackId === "string" ? parsed.currentTrackId : null,
      progressSeconds: Number.isFinite(parsed.progressSeconds) ? Number(parsed.progressSeconds) : 0,
      playbackMode:
        parsed.playbackMode === "shuffle" || parsed.playbackMode === "repeat-one" || parsed.playbackMode === "queue"
          ? parsed.playbackMode
          : "queue",
      shuffleSeed: typeof parsed.shuffleSeed === "number" ? parsed.shuffleSeed : null,
      shuffleHistory: Array.isArray(parsed.shuffleHistory)
        ? parsed.shuffleHistory.filter((item): item is number => Number.isInteger(item))
        : [],
      shuffleFuture: Array.isArray(parsed.shuffleFuture)
        ? parsed.shuffleFuture.filter((item): item is number => Number.isInteger(item))
        : []
    };
  } catch {
    return null;
  }
};
const writePersistedSession = (session: PersistedPlayerSession | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!session) {
      window.localStorage.removeItem(PLAYER_SESSION_KEY);
      return;
    }

    window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage write failures to keep playback responsive.
  }
};
const pickTrueRandomNextIndex = (queue: QueueState, currentIndex: number) => {
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
const canSetSinkId = (element: HTMLAudioElement): element is HTMLAudioElement & { setSinkId: (sinkId: string) => Promise<void> } =>
  typeof (element as HTMLAudioElement & { setSinkId?: unknown }).setSinkId === "function";
const applyOutputDevice = async (deviceId: string) => {
  const results = await Promise.all(
    Object.values(decks).map(async ({ element }) => {
      if (!canSetSinkId(element)) {
        return false;
      }

      try {
        await element.setSinkId(deviceId);
        return true;
      } catch {
        return false;
      }
    })
  );

  return results.some(Boolean);
};

let audioContext: AudioContext | null = null;
let deckMixNode: GainNode | null = null;
let masterGainNode: GainNode | null = null;
let stereoPannerNode: StereoPannerNode | null = null;
let monoSplitterNode: ChannelSplitterNode | null = null;
let monoMergeNode: ChannelMergerNode | null = null;
let monoLeftToLeftGainNode: GainNode | null = null;
let monoRightToLeftGainNode: GainNode | null = null;
let monoLeftToRightGainNode: GainNode | null = null;
let monoRightToRightGainNode: GainNode | null = null;
let currentChannelMode: "stereo" | "mono" = "stereo";
let trackSwitchInFlight = false;
let autoAdvanceTrackId: string | null = null;

const ensureAudioGraph = () => {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return;
  }

  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  if (deckMixNode && masterGainNode && Object.values(decks).every((deck) => deck.sourceNode && deck.gainNode)) {
    return;
  }

  deckMixNode = audioContext.createGain();
  masterGainNode = audioContext.createGain();
  monoSplitterNode = audioContext.createChannelSplitter(2);
  monoMergeNode = audioContext.createChannelMerger(2);
  monoLeftToLeftGainNode = audioContext.createGain();
  monoRightToLeftGainNode = audioContext.createGain();
  monoLeftToRightGainNode = audioContext.createGain();
  monoRightToRightGainNode = audioContext.createGain();

  monoLeftToLeftGainNode.gain.value = 0.5;
  monoRightToLeftGainNode.gain.value = 0.5;
  monoLeftToRightGainNode.gain.value = 0.5;
  monoRightToRightGainNode.gain.value = 0.5;

  Object.values(decks).forEach((deck) => {
    if (deck.sourceNode && deck.gainNode) {
      return;
    }

    deck.sourceNode = audioContext!.createMediaElementSource(deck.element);
    deck.gainNode = audioContext!.createGain();
    deck.gainNode.gain.value = deck.id === activeDeckId ? 1 : 0;
    deck.sourceNode.connect(deck.gainNode);
    deck.gainNode.connect(deckMixNode!);
  });

  deckMixNode.connect(monoSplitterNode);
  monoSplitterNode.connect(monoLeftToLeftGainNode, 0);
  monoSplitterNode.connect(monoRightToLeftGainNode, 1);
  monoSplitterNode.connect(monoLeftToRightGainNode, 0);
  monoSplitterNode.connect(monoRightToRightGainNode, 1);
  monoLeftToLeftGainNode.connect(monoMergeNode, 0, 0);
  monoRightToLeftGainNode.connect(monoMergeNode, 0, 0);
  monoLeftToRightGainNode.connect(monoMergeNode, 0, 1);
  monoRightToRightGainNode.connect(monoMergeNode, 0, 1);

  if (typeof audioContext.createStereoPanner === "function") {
    stereoPannerNode = audioContext.createStereoPanner();
    stereoPannerNode.connect(masterGainNode);
  }
  masterGainNode.connect(audioContext.destination);
  currentChannelMode = "stereo";
  deckMixNode.connect(stereoPannerNode ?? masterGainNode);
};

const resumeAudioGraph = async () => {
  ensureAudioGraph();
  if (audioContext && audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      // Ignore resume failures and let the element fallback continue.
    }
  }
};

const setOutputGainImmediate = (value: number) => {
  const clamped = clamp(value, 0, 1);
  ensureAudioGraph();
  if (masterGainNode && audioContext) {
    const now = audioContext.currentTime;
    masterGainNode.gain.cancelScheduledValues(now);
    masterGainNode.gain.setValueAtTime(clamped, now);
    return;
  }

  Object.values(decks).forEach(({ element }) => {
    element.volume = clamped;
  });
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const rampOutputGain = async (targetValue: number, durationSeconds: number) => {
  const clampedTarget = clamp(targetValue, 0, 1);
  const clampedDuration = Math.max(0, durationSeconds);
  if (clampedDuration <= 0) {
    setOutputGainImmediate(clampedTarget);
    return;
  }

  ensureAudioGraph();
  if (masterGainNode && audioContext) {
    const now = audioContext.currentTime;
    const currentValue = masterGainNode.gain.value;
    masterGainNode.gain.cancelScheduledValues(now);
    masterGainNode.gain.setValueAtTime(currentValue, now);
    masterGainNode.gain.linearRampToValueAtTime(clampedTarget, now + clampedDuration);
    await wait(clampedDuration * 1000);
    return;
  }

  Object.values(decks).forEach(({ element }) => {
    element.volume = clampedTarget;
  });
};

const setDeckGainImmediate = (deck: AudioDeck, value: number) => {
  const clamped = clamp(value, 0, 1);
  ensureAudioGraph();
  if (deck.gainNode && audioContext) {
    const now = audioContext.currentTime;
    deck.gainNode.gain.cancelScheduledValues(now);
    deck.gainNode.gain.setValueAtTime(clamped, now);
    return;
  }

  deck.element.volume = clamped;
};

const rampDeckGain = async (deck: AudioDeck, targetValue: number, durationSeconds: number) => {
  const clampedTarget = clamp(targetValue, 0, 1);
  const clampedDuration = Math.max(0, durationSeconds);
  if (clampedDuration <= 0) {
    setDeckGainImmediate(deck, clampedTarget);
    return;
  }

  ensureAudioGraph();
  if (deck.gainNode && audioContext) {
    const now = audioContext.currentTime;
    const currentValue = deck.gainNode.gain.value;
    deck.gainNode.gain.cancelScheduledValues(now);
    deck.gainNode.gain.setValueAtTime(currentValue, now);
    deck.gainNode.gain.linearRampToValueAtTime(clampedTarget, now + clampedDuration);
    await wait(clampedDuration * 1000);
    return;
  }

  deck.element.volume = clampedTarget;
};

const applyChannelBalance = (balance: number) => {
  ensureAudioGraph();
  if (stereoPannerNode && audioContext) {
    const now = audioContext.currentTime;
    stereoPannerNode.pan.cancelScheduledValues(now);
    stereoPannerNode.pan.setValueAtTime(resolveBalancePan(balance), now);
  }
};

const applyChannelMode = (mode: "stereo" | "mono") => {
  ensureAudioGraph();
  const targetNode = stereoPannerNode ?? masterGainNode;
  if (!deckMixNode || !targetNode || !monoMergeNode) {
    return;
  }

  if (currentChannelMode === mode) {
    return;
  }

  try {
    deckMixNode.disconnect(targetNode);
  } catch {
    // Ignore already-disconnected state.
  }

  try {
    monoMergeNode.disconnect(targetNode);
  } catch {
    // Ignore already-disconnected state.
  }

  if (mode === "mono") {
    monoMergeNode.connect(targetNode);
  } else {
    deckMixNode.connect(targetNode);
  }

  currentChannelMode = mode;
};

const canAutoAdvanceWithFade = (
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

const resolveAutoAdvanceLeadSeconds = (fadeMode: FadeMode, transitionSeconds: number) =>
  transitionSeconds;

const resetDeck = (deck: AudioDeck, options: { clearSource?: boolean } = {}) => {
  deck.element.pause();
  try {
    deck.element.currentTime = 0;
  } catch {
    // Ignore reset failures while the media element is swapping sources.
  }
  setDeckGainImmediate(deck, deck.id === activeDeckId ? 1 : 0);
  if (options.clearSource) {
    deck.element.removeAttribute("src");
    deck.element.load();
    deck.trackId = null;
  }
};

const prepareDeck = async (
  deck: AudioDeck,
  track: Track,
  startAtSeconds: number,
  playbackRate: number,
  isMuted: boolean
) => {
  deck.trackId = track.id;
  deck.element.pause();
  deck.element.src = toFileUrl(track.path);
  deck.element.load();
  deck.element.playbackRate = playbackRate;
  deck.element.muted = isMuted;

  await new Promise<void>((resolve, reject) => {
    const handleReady = () => {
      deck.element.removeEventListener("loadedmetadata", handleReady);
      deck.element.removeEventListener("error", handleError);
      resolve();
    };
    const handleError = () => {
      deck.element.removeEventListener("loadedmetadata", handleReady);
      deck.element.removeEventListener("error", handleError);
      reject(new Error(`Failed to load media: ${track.path}`));
    };

    deck.element.addEventListener("loadedmetadata", handleReady);
    deck.element.addEventListener("error", handleError);
  });

  deck.element.currentTime = Math.min(startAtSeconds, resolveElementDurationSeconds(deck.element, track.duration));
};

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

const loadTrack = async (
  queue: QueueState,
  playback: PlaybackState,
  trackMap: Record<string, Track>,
  trackId: string | null,
  isMuted: boolean,
  runtimeDuckActive: boolean,
  runtimeDuckFactor: number,
  channelBalance: number,
  fadeEnabled: boolean,
  fadeMode: FadeMode,
  crossfadeSeconds: number,
  options: {
    autoplay?: boolean;
    startAtSeconds?: number;
    replayGainEnabled?: boolean;
    replayGainMultiplier?: number;
  } = {}
) => {
  trackSwitchInFlight = true;
  autoAdvanceTrackId = null;
  try {
    if (!trackId) {
      Object.values(decks).forEach((deck) => resetDeck(deck, { clearSource: true }));
      setOutputGainImmediate(0);
      return {
        currentTrack: null,
        lyrics: null,
        playback: {
          ...playback,
          isPlaying: false
        }
      };
    }

    const currentTrack = trackMap[trackId] ?? null;
    if (!currentTrack) {
      return {
        currentTrack: null,
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

    applyChannelBalance(channelBalance);

    await prepareDeck(nextDeck, currentTrack, startAtSeconds, playback.playbackRate, isMuted);
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
          activeDeckId = nextDeck.id;
          setDeckGainImmediate(nextDeck, 0);
          await nextDeck.element.play();
          void rampDeckGain(nextDeck, 1, transitionSeconds);
        } else {
          setDeckGainImmediate(nextDeck, 0);
          activeDeckId = nextDeck.id;
          await nextDeck.element.play();
          await Promise.all([
            rampDeckGain(previousDeck, 0, transitionSeconds),
            rampDeckGain(nextDeck, 1, transitionSeconds)
          ]);
          previousDeck.element.pause();
          previousDeck.element.removeAttribute("src");
          previousDeck.element.load();
          previousDeck.trackId = null;
        }
      } else {
        if (hasActiveSource) {
          resetDeck(previousDeck, { clearSource: true });
        }
        activeDeckId = nextDeck.id;
        setDeckGainImmediate(nextDeck, transitionSeconds > 0 ? 0 : 1);
        await nextDeck.element.play();
        if (transitionSeconds > 0) {
          void rampDeckGain(nextDeck, 1, transitionSeconds);
        } else {
          setDeckGainImmediate(nextDeck, 1);
        }
      }
      await bridge.collection.recordPlay(currentTrack.id);
    } else {
      if (hasActiveSource) {
        resetDeck(previousDeck, { clearSource: true });
      }
      activeDeckId = nextDeck.id;
      setDeckGainImmediate(nextDeck, 1);
      nextDeck.element.pause();
    }
    const lyrics = await bridge.lyrics.getLyrics(currentTrack.id);

    const nextPlayback = startTrackPlayback(playback, {
      queue,
      currentTrackId: toPlayerTrackId(currentTrack.id),
      progressSeconds: nextDeck.element.currentTime,
      durationSeconds: resolveDurationSeconds(currentTrack.duration)
    });

    return {
      currentTrack,
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
    Object.values(decks).forEach((deck) => {
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

    Object.values(decks).forEach((deck) => {
      deck.element.addEventListener("timeupdate", () => {
        if (deck.id !== activeDeckId) {
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
          !trackSwitchInFlight &&
          state.currentTrack &&
          transitionSeconds > 0 &&
          remainingSeconds > 0.05 &&
          remainingSeconds <= autoAdvanceLeadSeconds &&
          autoAdvanceTrackId !== state.currentTrack.id &&
          canAutoAdvanceWithFade(state.queue, state.playback.playbackMode, state.shuffleStrategy)
        ) {
          autoAdvanceTrackId = state.currentTrack.id;
          void get().playNext("auto");
        }
        if (Math.floor(deck.element.currentTime * 2) % 2 === 0) {
          get().persistSession();
        }
      });

      deck.element.addEventListener("loadedmetadata", () => {
        if (deck.id === activeDeckId) {
          syncDuration();
        }
      });
      deck.element.addEventListener("durationchange", () => {
        if (deck.id === activeDeckId) {
          syncDuration();
        }
      });
      deck.element.addEventListener("canplay", () => {
        if (deck.id === activeDeckId) {
          syncDuration();
        }
      });

      deck.element.addEventListener("pause", () => {
        if (deck.id !== activeDeckId) {
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
        if (deck.id !== activeDeckId) {
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
        if (deck.id !== activeDeckId || trackSwitchInFlight) {
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
      Object.values(decks).forEach((deck) => {
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
    Object.values(decks).forEach((deck) => {
      deck.element.muted = store.isMuted;
    });

    if (nextReplayGainEnabled !== null) {
      void store.refreshReplayGain();
    }
    store.persistSession();
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
      Object.values(decks).forEach((deck) => deck.element.pause());
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
      Object.values(decks).forEach((deck) => deck.element.pause());
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
    setOutputGainImmediate(
      resolveOutputVolume(volume, state.runtimeDuckActive, state.runtimeDuckFactor, state.replayGainEnabled, state.replayGainMultiplier)
    );
    Object.values(decks).forEach((deck) => {
      deck.element.muted = state.isMuted;
    });
    set((state) => ({
      playback: setVolume(state.playback, volume),
      isMuted: volume <= 0,
      lastVolumeBeforeMute: volume > 0 ? volume : state.lastVolumeBeforeMute
    }));
    get().persistSession();
  },
  setPlaybackRateLevel: (rate) => {
    const clampedRate = Math.min(3, Math.max(0.5, rate));
    Object.values(decks).forEach((deck) => {
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
        Object.values(decks).forEach((deck) => {
          deck.element.muted = true;
        });
        return {
          isMuted: true,
          lastVolumeBeforeMute: state.playback.volume
        };
      }

      const restoredVolume = state.playback.volume > 0 ? state.playback.volume : Math.max(state.lastVolumeBeforeMute, 0.05);
      Object.values(decks).forEach((deck) => {
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
    get().persistSession();
  },
  setRuntimeDuck: (active) => {
    set((state) => {
      const nextActive = Boolean(active);
      if (state.runtimeDuckActive === nextActive) {
        return state;
      }

      if (!state.isMuted) {
        Object.values(decks).forEach((deck) => {
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
    Object.values(decks).forEach((deck) => resetDeck(deck, { clearSource: true }));
    activeDeckId = "a";
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
    writePersistedSession(null);
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
      writePersistedSession(null);
      return;
    }

    writePersistedSession({
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
    const session = readPersistedSession();
    if (!session) {
      return;
    }

    const trackMap = Object.fromEntries(session.tracks.map((track) => [track.id, track]));
    const currentTrack = session.currentTrackId ? trackMap[session.currentTrackId] ?? null : null;
    if (!currentTrack) {
      writePersistedSession(null);
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
