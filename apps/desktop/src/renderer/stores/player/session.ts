import type { BrowseMode, PlayableItem, Track } from "@aural/domain";
import type { PlaybackState, QueueState } from "@aural/player";
import { bridge } from "@renderer/lib/bridge";
import { trackToPlayableItem } from "@renderer/lib/playable";
import { flushPendingSettingsForKeys, persistSetting } from "@renderer/lib/settingsPersistence";

const PLAYER_SESSION_SETTING_KEY = "player.session";
const LEGACY_PLAYER_SESSION_KEY = "aural.player.session.v1";

export type PersistedPlayerSession = {
  queue: QueueState;
  items: PlayableItem[];
  currentItemId: string | null;
  progressSeconds: number;
  playbackMode: PlaybackState["playbackMode"];
  shuffleSeed: number | null;
  shuffleHistory: number[];
  shuffleFuture: number[];
};

export type PersistedPlayerSessions = {
  lastMode: BrowseMode;
  localSession: PersistedPlayerSession | null;
  onlineSession: PersistedPlayerSession | null;
};

type LegacyPersistedPlayerSession = {
  queue: QueueState;
  tracks: Track[];
  currentTrackId: string | null;
  progressSeconds: number;
  playbackMode: PlaybackState["playbackMode"];
  shuffleSeed: number | null;
  shuffleHistory: number[];
  shuffleFuture: number[];
};

const normalizeSession = (value: Partial<PersistedPlayerSession> | null | undefined): PersistedPlayerSession | null => {
  if (!value?.queue || !Array.isArray(value.items) || !value.items.length) {
    return null;
  }

  return {
    queue: value.queue,
    items: value.items,
    currentItemId: typeof value.currentItemId === "string" ? value.currentItemId : null,
    progressSeconds: Number.isFinite(value.progressSeconds) ? Number(value.progressSeconds) : 0,
    playbackMode:
      value.playbackMode === "shuffle" || value.playbackMode === "repeat-one" || value.playbackMode === "queue"
        ? value.playbackMode
        : "queue",
    shuffleSeed: typeof value.shuffleSeed === "number" ? value.shuffleSeed : null,
    shuffleHistory: Array.isArray(value.shuffleHistory)
      ? value.shuffleHistory.filter((item): item is number => Number.isInteger(item))
      : [],
    shuffleFuture: Array.isArray(value.shuffleFuture)
      ? value.shuffleFuture.filter((item): item is number => Number.isInteger(item))
      : []
  };
};

const parseSessionEnvelope = (raw: string | null): PersistedPlayerSessions | null => {
  try {
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedPlayerSessions> | null;
    if (!parsed) {
      return null;
    }

    return {
      lastMode: parsed.lastMode === "online" ? "online" : "local",
      localSession: normalizeSession(parsed.localSession),
      onlineSession: normalizeSession(parsed.onlineSession)
    };
  } catch {
    return null;
  }
};

const parseLegacySession = (raw: string | null): PersistedPlayerSession | null => {
  try {
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LegacyPersistedPlayerSession> | null;
    if (!parsed?.queue || !Array.isArray(parsed.tracks) || !parsed.tracks.length) {
      return null;
    }

    return normalizeSession({
      queue: parsed.queue,
      items: parsed.tracks.map(trackToPlayableItem),
      currentItemId: typeof parsed.currentTrackId === "string" ? parsed.currentTrackId : null,
      progressSeconds: parsed.progressSeconds,
      playbackMode: parsed.playbackMode,
      shuffleSeed: parsed.shuffleSeed,
      shuffleHistory: parsed.shuffleHistory,
      shuffleFuture: parsed.shuffleFuture
    });
  } catch {
    return null;
  }
};

const readLegacyPersistedSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return parseLegacySession(window.localStorage.getItem(LEGACY_PLAYER_SESSION_KEY));
};

export const readPersistedSessions = async (): Promise<PersistedPlayerSessions | null> => {
  const stored = await bridge.settings.getSetting(PLAYER_SESSION_SETTING_KEY);
  const parsed = typeof stored === "string" ? parseSessionEnvelope(stored) : null;
  if (parsed) {
    return parsed;
  }

  const legacy = readLegacyPersistedSession();
  if (!legacy) {
    return null;
  }

  const migrated: PersistedPlayerSessions = {
    lastMode: "local",
    localSession: legacy,
    onlineSession: null
  };
  void writePersistedSessions(migrated);

  try {
    window.localStorage.removeItem(LEGACY_PLAYER_SESSION_KEY);
  } catch {
    // Ignore legacy cleanup failures.
  }

  return migrated;
};

export const readPersistedSession = async (mode?: BrowseMode): Promise<PersistedPlayerSession | null> => {
  const sessions = await readPersistedSessions();
  if (!sessions) {
    return null;
  }

  const targetMode = mode ?? sessions.lastMode;
  return targetMode === "online" ? sessions.onlineSession : sessions.localSession;
};

export const writePersistedSessions = async (sessions: PersistedPlayerSessions | null, options?: { flush?: boolean }) => {
  try {
    await persistSetting(PLAYER_SESSION_SETTING_KEY, sessions ? JSON.stringify(sessions) : null);
    if (options?.flush) {
      await flushPendingSettingsForKeys([PLAYER_SESSION_SETTING_KEY]);
    }
  } catch {
    // Ignore persistence failures to keep playback responsive.
  }
};

export const writePersistedSession = async (
  mode: BrowseMode,
  session: PersistedPlayerSession | null,
  lastMode: BrowseMode = mode,
  options?: { flush?: boolean }
) => {
  const existing = (await readPersistedSessions()) ?? {
    lastMode,
    localSession: null,
    onlineSession: null
  };

  await writePersistedSessions({
    lastMode,
    localSession: mode === "local" ? session : existing.localSession,
    onlineSession: mode === "online" ? session : existing.onlineSession
  }, options);
};
