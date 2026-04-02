import type { Track } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { SpectrumEngine, type SpectrumFrame } from "@renderer/lib/spectrumEngine";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";
export type { SpectrumFrame } from "@renderer/lib/spectrumEngine";

export type DeckId = "a" | "b";
export type FadeMode = "fade" | "crossfade";
export type ShuffleStrategy = "true-random" | "anti-repeat";
export type SpectrumListener = (frame: SpectrumFrame) => void;
export type AudioDeck = {
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

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const getActiveDeck = () => decks[activeDeckId];
export const getInactiveDeck = () => decks[activeDeckId === "a" ? "b" : "a"];
export const getAllDecks = () => Object.values(decks);
export const getActiveAudioElement = () => getActiveDeck().element;
export const setActiveDeckId = (id: DeckId) => {
  activeDeckId = id;
};
export const resolveElementDurationSeconds = (element: HTMLAudioElement, fallbackSeconds = 0) =>
  Number.isFinite(element.duration) && element.duration > 0 ? element.duration : Math.max(0, fallbackSeconds);
export const resolveDurationSeconds = (fallbackSeconds = 0) => resolveElementDurationSeconds(getActiveAudioElement(), fallbackSeconds);
export const resolveReplayGainMultiplier = (enabled: boolean, multiplier: number) =>
  enabled ? clamp(Number.isFinite(multiplier) ? multiplier : 1, 0.05, 8) : 1;
export const resolveOutputVolume = (
  volume: number,
  duckActive: boolean,
  duckFactor: number,
  replayGainEnabled = false,
  replayGainMultiplier = 1
) => Math.max(0, Math.min(1, volume * (duckActive ? duckFactor : 1) * resolveReplayGainMultiplier(replayGainEnabled, replayGainMultiplier)));
export const resolveCrossfadeSeconds = (value: number) => clamp(Number.isFinite(value) ? value : 0, 0, 5);
export const resolveFadeTransitionSeconds = (enabled: boolean, value: number) => (enabled ? resolveCrossfadeSeconds(value) : 0);
export const resolveFadeMode = (value: unknown): FadeMode => (value === "fade" ? "fade" : "crossfade");
const resolveBalancePan = (value: number) => clamp((Number.isFinite(value) ? value : 0) / 100, -1, 1);
export const resolveShuffleStrategy = (value: unknown): ShuffleStrategy =>
  value === "true-random" ? "true-random" : "anti-repeat";

const canSetSinkId = (element: HTMLAudioElement): element is HTMLAudioElement & { setSinkId: (sinkId: string) => Promise<void> } =>
  typeof (element as HTMLAudioElement & { setSinkId?: unknown }).setSinkId === "function";

export const applyOutputDevice = async (deviceId: string) => {
  const results = await Promise.all(
    getAllDecks().map(async ({ element }) => {
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

export const persistPlayerVolumePreference = (volume: number) => {
  void bridge.settings
    .setSetting("player.volume", volume)
    .then(() => {
      usePreferencesStore.getState().update("player.volume", volume);
    })
    .catch(() => {
      // Ignore persistence failures and keep playback responsive.
    });
};

let audioContext: AudioContext | null = null;
let deckMixNode: GainNode | null = null;
let masterGainNode: GainNode | null = null;
let spectrumAnalyserNode: AnalyserNode | null = null;
let spectrumDataBuffer: Uint8Array<ArrayBuffer> | null = null;
let spectrumEngine: SpectrumEngine | null = null;
let stereoPannerNode: StereoPannerNode | null = null;
let monoSplitterNode: ChannelSplitterNode | null = null;
let monoMergeNode: ChannelMergerNode | null = null;
let monoLeftToLeftGainNode: GainNode | null = null;
let monoRightToLeftGainNode: GainNode | null = null;
let monoLeftToRightGainNode: GainNode | null = null;
let monoRightToRightGainNode: GainNode | null = null;
let currentChannelMode: "stereo" | "mono" = "stereo";
let spectrumFrame: SpectrumFrame = {
  bars: Array.from({ length: 64 }, () => 0),
  energy: 0,
  pulse: 0,
  lowBandEnergy: 0,
  timestamp: Date.now()
};
const spectrumListeners = new Set<SpectrumListener>();
let spectrumFrameRaf: number | null = null;

const emitSpectrumFrame = (frame: SpectrumFrame) => {
  spectrumFrame = frame;
  spectrumListeners.forEach((listener) => {
    listener(frame);
  });
};

const stopSpectrumLoop = () => {
  if (spectrumFrameRaf !== null) {
    window.cancelAnimationFrame(spectrumFrameRaf);
    spectrumFrameRaf = null;
  }
};

const tickSpectrumFrame = () => {
  if (!spectrumListeners.size) {
    stopSpectrumLoop();
    return;
  }

  ensureAudioGraph();
  if (spectrumAnalyserNode && spectrumDataBuffer && spectrumEngine) {
    spectrumAnalyserNode.getByteFrequencyData(spectrumDataBuffer);
    const frame = spectrumEngine.update(spectrumDataBuffer, Date.now());
    emitSpectrumFrame(frame);
  } else {
    emitSpectrumFrame(spectrumEngine?.getFrame(Date.now()) ?? spectrumFrame);
  }

  spectrumFrameRaf = window.requestAnimationFrame(tickSpectrumFrame);
};

const ensureSpectrumLoop = () => {
  if (!spectrumListeners.size || spectrumFrameRaf !== null) {
    return;
  }

  spectrumFrameRaf = window.requestAnimationFrame(tickSpectrumFrame);
};

export const ensureAudioGraph = () => {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return;
  }

  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  if (deckMixNode && masterGainNode && getAllDecks().every((deck) => deck.sourceNode && deck.gainNode)) {
    if (!spectrumAnalyserNode && audioContext) {
      spectrumAnalyserNode = audioContext.createAnalyser();
      spectrumAnalyserNode.fftSize = 2048;
      spectrumAnalyserNode.smoothingTimeConstant = 0.84;
      spectrumAnalyserNode.minDecibels = -92;
      spectrumAnalyserNode.maxDecibels = -12;
      spectrumDataBuffer = new Uint8Array<ArrayBuffer>(new ArrayBuffer(spectrumAnalyserNode.frequencyBinCount));
      spectrumEngine = new SpectrumEngine({ barCount: 64 });
      masterGainNode.connect(spectrumAnalyserNode);
    }
    return;
  }

  deckMixNode = audioContext.createGain();
  masterGainNode = audioContext.createGain();
  spectrumAnalyserNode = audioContext.createAnalyser();
  spectrumAnalyserNode.fftSize = 2048;
  spectrumAnalyserNode.smoothingTimeConstant = 0.84;
  spectrumAnalyserNode.minDecibels = -92;
  spectrumAnalyserNode.maxDecibels = -12;
  spectrumDataBuffer = new Uint8Array<ArrayBuffer>(new ArrayBuffer(spectrumAnalyserNode.frequencyBinCount));
  spectrumEngine = new SpectrumEngine({ barCount: 64 });
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

  getAllDecks().forEach((deck) => {
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
  masterGainNode.connect(spectrumAnalyserNode);
  currentChannelMode = "stereo";
  deckMixNode.connect(stereoPannerNode ?? masterGainNode);
};

export const resumeAudioGraph = async () => {
  ensureAudioGraph();
  if (audioContext && audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      // Ignore resume failures and let the element fallback continue.
    }
  }
};

export const setOutputGainImmediate = (value: number) => {
  const clamped = clamp(value, 0, 1);
  ensureAudioGraph();
  if (masterGainNode && audioContext) {
    const now = audioContext.currentTime;
    masterGainNode.gain.cancelScheduledValues(now);
    masterGainNode.gain.setValueAtTime(clamped, now);
    return;
  }

  getAllDecks().forEach(({ element }) => {
    element.volume = clamped;
  });
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const rampOutputGain = async (targetValue: number, durationSeconds: number) => {
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

  getAllDecks().forEach(({ element }) => {
    element.volume = clampedTarget;
  });
};

export const setDeckGainImmediate = (deck: AudioDeck, value: number) => {
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

export const rampDeckGain = async (deck: AudioDeck, targetValue: number, durationSeconds: number) => {
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

export const applyChannelBalance = (balance: number) => {
  ensureAudioGraph();
  if (stereoPannerNode && audioContext) {
    const now = audioContext.currentTime;
    stereoPannerNode.pan.cancelScheduledValues(now);
    stereoPannerNode.pan.setValueAtTime(resolveBalancePan(balance), now);
  }
};

export const applyChannelMode = (mode: "stereo" | "mono") => {
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

export const resetDeck = (deck: AudioDeck, options: { clearSource?: boolean } = {}) => {
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

export const prepareDeck = async (
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

export const getPlayerSpectrumFrame = (): SpectrumFrame => spectrumFrame;

export const subscribePlayerSpectrum = (listener: SpectrumListener) => {
  spectrumListeners.add(listener);
  listener(spectrumFrame);
  ensureSpectrumLoop();

  return () => {
    spectrumListeners.delete(listener);
    if (!spectrumListeners.size) {
      stopSpectrumLoop();
    }
  };
};
