import { bridge } from "@renderer/lib/bridge";
import type { Track } from "@aural/domain";
import type { PlaybackState, QueueState } from "@aural/player";

const PLAYER_SESSION_SETTING_KEY = "player.session";
const LEGACY_PLAYER_SESSION_KEY = "aural.player.session.v1";

export type PersistedPlayerSession = {
  queue: QueueState;
  tracks: Track[];
  currentTrackId: string | null;
  progressSeconds: number;
  playbackMode: PlaybackState["playbackMode"];
  shuffleSeed: number | null;
  shuffleHistory: number[];
  shuffleFuture: number[];
};

const parsePersistedSession = (raw: string | null): PersistedPlayerSession | null => {
  try {
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

const readLegacyPersistedSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return parsePersistedSession(window.localStorage.getItem(LEGACY_PLAYER_SESSION_KEY));
};

export const readPersistedSession = async (): Promise<PersistedPlayerSession | null> => {
  const stored = await bridge.settings.getSetting(PLAYER_SESSION_SETTING_KEY);
  const parsed = typeof stored === "string" ? parsePersistedSession(stored) : null;
  if (parsed) {
    return parsed;
  }

  const legacy = readLegacyPersistedSession();
  if (!legacy) {
    return null;
  }

  void writePersistedSession(legacy);

  try {
    window.localStorage.removeItem(LEGACY_PLAYER_SESSION_KEY);
  } catch {
    // Ignore legacy cleanup failures.
  }

  return legacy;
};

export const writePersistedSession = async (session: PersistedPlayerSession | null) => {
  try {
    await bridge.settings.setSetting(PLAYER_SESSION_SETTING_KEY, session ? JSON.stringify(session) : null);
  } catch {
    // Ignore persistence failures to keep playback responsive.
  }
};
