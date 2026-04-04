import type { SettingKey, SettingValue } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";

export type SettingPersistenceStrategy = "immediate" | "debounced" | "idle" | "session-throttled";

const SESSION_KEY: SettingKey = "player.session";
const DEBOUNCE_DELAYS: Partial<Record<SettingKey, number>> = {
  "player.volume": 250,
  "player.playbackRate": 300,
  "player.channelBalance": 300,
  "player.crossfadeSeconds": 300
};
const IDLE_DELAYS: Partial<Record<SettingKey, number>> = {
  "settings.centerDraft": 1000,
  "appearance.customAccents": 1000
};
const SESSION_THROTTLE_MS = 5000;

type PendingEntry = {
  key: SettingKey;
  value: SettingValue;
  strategy: SettingPersistenceStrategy;
  sequence: number;
};

type ImmediateWaiter = {
  sequence: number;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type IdleCallbackHandle = number;
type IdleCallbackScheduler = (callback: IdleRequestCallback, options?: IdleRequestOptions) => IdleCallbackHandle;
type IdleCallbackCanceller = (handle: IdleCallbackHandle) => void;

const pendingEntries = new Map<SettingKey, PendingEntry>();
const debounceTimers = new Map<SettingKey, number>();
const idleTimers = new Map<SettingKey, number>();
const idleHandles = new Map<SettingKey, IdleCallbackHandle>();
const immediateWaiters = new Map<SettingKey, ImmediateWaiter[]>();

let writeSequence = 0;
let immediateFlushQueued = false;
let sessionFlushTimer: number | null = null;
let lastSessionFlushAt = 0;

const getRequestIdleCallback = (): IdleCallbackScheduler | null =>
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (window.requestIdleCallback as IdleCallbackScheduler)
    : null;

const getCancelIdleCallback = (): IdleCallbackCanceller | null =>
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? (window.cancelIdleCallback as IdleCallbackCanceller)
    : null;

const clearScheduledFlush = (key: SettingKey) => {
  const debounceTimer = debounceTimers.get(key);
  if (debounceTimer !== undefined) {
    window.clearTimeout(debounceTimer);
    debounceTimers.delete(key);
  }

  const idleTimer = idleTimers.get(key);
  if (idleTimer !== undefined) {
    window.clearTimeout(idleTimer);
    idleTimers.delete(key);
  }

  const idleHandle = idleHandles.get(key);
  if (idleHandle !== undefined) {
    getCancelIdleCallback()?.(idleHandle);
    idleHandles.delete(key);
  }
};

const resolveImmediateWaiters = (key: SettingKey, sequence: number) => {
  const waiters = immediateWaiters.get(key);
  if (!waiters?.length) {
    return;
  }

  const pending: ImmediateWaiter[] = [];
  for (const waiter of waiters) {
    if (waiter.sequence <= sequence) {
      waiter.resolve();
      continue;
    }
    pending.push(waiter);
  }

  if (pending.length) {
    immediateWaiters.set(key, pending);
    return;
  }

  immediateWaiters.delete(key);
};

const rejectImmediateWaiters = (key: SettingKey, sequence: number, error: unknown) => {
  const waiters = immediateWaiters.get(key);
  if (!waiters?.length) {
    return;
  }

  const pending: ImmediateWaiter[] = [];
  for (const waiter of waiters) {
    if (waiter.sequence <= sequence) {
      waiter.reject(error);
      continue;
    }
    pending.push(waiter);
  }

  if (pending.length) {
    immediateWaiters.set(key, pending);
    return;
  }

  immediateWaiters.delete(key);
};

const collectFlushEntries = (keys: SettingKey[]) =>
  keys
    .map((key) => pendingEntries.get(key))
    .filter((entry): entry is PendingEntry => Boolean(entry));

const persistEntries = async (entries: PendingEntry[]) => {
  if (!entries.length) {
    return;
  }

  const records = entries.map(({ key, value }) => ({ key, value }));
  await bridge.settings.setManySettings(records);
};

export const resolveSettingPersistenceStrategy = (key: SettingKey): SettingPersistenceStrategy => {
  if (key === SESSION_KEY) {
    return "session-throttled";
  }

  if (key in DEBOUNCE_DELAYS) {
    return "debounced";
  }

  if (key in IDLE_DELAYS) {
    return "idle";
  }

  return "immediate";
};

const flushPendingEntries = async (keys: SettingKey[]) => {
  const entries = collectFlushEntries(keys);
  if (!entries.length) {
    return;
  }

  try {
    await persistEntries(entries);
    for (const entry of entries) {
      const current = pendingEntries.get(entry.key);
      if (current?.sequence === entry.sequence) {
        pendingEntries.delete(entry.key);
      }
      if (entry.key === SESSION_KEY) {
        lastSessionFlushAt = Date.now();
      }
      resolveImmediateWaiters(entry.key, entry.sequence);
    }
  } catch (error) {
    for (const entry of entries) {
      if (entry.strategy === "immediate") {
        const current = pendingEntries.get(entry.key);
        if (current?.sequence === entry.sequence) {
          pendingEntries.delete(entry.key);
        }
        rejectImmediateWaiters(entry.key, entry.sequence, error);
      }
    }

    throw error;
  }
};

const queueImmediateFlush = () => {
  if (immediateFlushQueued) {
    return;
  }

  immediateFlushQueued = true;
  queueMicrotask(() => {
    immediateFlushQueued = false;
    const keys = Array.from(pendingEntries.values())
      .filter((entry) => entry.strategy === "immediate")
      .map((entry) => entry.key);

    void flushPendingEntries(keys).catch(() => {
      // Let immediate callers handle rejection through their own pending promises.
    });
  });
};

const scheduleDebouncedFlush = (key: SettingKey) => {
  clearScheduledFlush(key);
  const timeoutMs = DEBOUNCE_DELAYS[key] ?? 300;
  const timer = window.setTimeout(() => {
    debounceTimers.delete(key);
    void flushPendingEntries([key]).catch(() => {
      // Keep delayed writes in memory and retry on next flush.
    });
  }, timeoutMs);
  debounceTimers.set(key, timer);
};

const scheduleIdleFlush = (key: SettingKey) => {
  clearScheduledFlush(key);
  const timeoutMs = IDLE_DELAYS[key] ?? 1000;
  const requestIdle = getRequestIdleCallback();
  const scheduleFlush = () => {
    void flushPendingEntries([key]).catch(() => {
      // Keep delayed writes in memory and retry on next flush.
    });
  };

  if (requestIdle) {
    const handle = requestIdle(() => {
      idleHandles.delete(key);
      idleTimers.delete(key);
      scheduleFlush();
    }, { timeout: timeoutMs });
    idleHandles.set(key, handle);
  }

  const timer = window.setTimeout(() => {
    idleTimers.delete(key);
    const handle = idleHandles.get(key);
    if (handle !== undefined) {
      getCancelIdleCallback()?.(handle);
      idleHandles.delete(key);
    }
    scheduleFlush();
  }, timeoutMs);
  idleTimers.set(key, timer);
};

const scheduleSessionFlush = () => {
  if (sessionFlushTimer !== null) {
    return;
  }

  const elapsed = Date.now() - lastSessionFlushAt;
  const waitMs = Math.max(0, SESSION_THROTTLE_MS - elapsed);
  sessionFlushTimer = window.setTimeout(() => {
    sessionFlushTimer = null;
    void flushPendingEntries([SESSION_KEY]).catch(() => {
      // Retry the session on the next lifecycle flush.
    });
  }, waitMs);
};

export const persistSetting = (key: SettingKey, value: SettingValue): Promise<void> => {
  const strategy = resolveSettingPersistenceStrategy(key);
  const sequence = ++writeSequence;

  pendingEntries.set(key, {
    key,
    value,
    strategy,
    sequence
  });

  if (strategy === "immediate") {
    const completion = new Promise<void>((resolve, reject) => {
      const waiters = immediateWaiters.get(key) ?? [];
      waiters.push({ sequence, resolve, reject });
      immediateWaiters.set(key, waiters);
    });
    queueImmediateFlush();
    return completion;
  }

  if (strategy === "debounced") {
    scheduleDebouncedFlush(key);
    return Promise.resolve();
  }

  if (strategy === "idle") {
    scheduleIdleFlush(key);
    return Promise.resolve();
  }

  scheduleSessionFlush();
  return Promise.resolve();
};

export const flushPendingSettingsForKeys = async (keys: SettingKey[]) => {
  for (const key of keys) {
    clearScheduledFlush(key);
  }
  if (keys.includes(SESSION_KEY) && sessionFlushTimer !== null) {
    window.clearTimeout(sessionFlushTimer);
    sessionFlushTimer = null;
  }
  await flushPendingEntries(keys);
};

export const flushAllPendingSettings = async () => {
  const keys = Array.from(pendingEntries.keys());
  await flushPendingSettingsForKeys(keys);
};
