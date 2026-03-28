import { create } from "zustand";
import type { SettingKey, SettingValue } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";
import { defaultSettings } from "@renderer/components/settings-catalog";

type PreferencesSnapshot = Partial<Record<SettingKey, SettingValue>>;
type ResolvedTheme = "light" | "dark";

const normalizeSnapshot = (records: Array<{ key: SettingKey; value: SettingValue }>): PreferencesSnapshot => {
  const next: PreferencesSnapshot = { ...defaultSettings };
  for (const record of records) {
    next[record.key] = record.value;
  }
  return next;
};

interface PreferencesStoreState {
  snapshot: PreferencesSnapshot;
  hydrated: boolean;
  resolvedTheme: ResolvedTheme;
  hydrate: (records: Array<{ key: SettingKey; value: SettingValue }>) => void;
  update: (key: SettingKey, value: SettingValue) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  load: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesStoreState>((set) => ({
  snapshot: { ...defaultSettings },
  hydrated: false,
  resolvedTheme: "dark",
  hydrate: (records) => {
    set({
      snapshot: normalizeSnapshot(records),
      hydrated: true
    });
  },
  update: (key, value) => {
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        [key]: value
      },
      hydrated: true
    }));
  },
  setResolvedTheme: (theme) => {
    set({ resolvedTheme: theme });
  },
  load: async () => {
    const records = await bridge.settings.getAll();
    set({
      snapshot: normalizeSnapshot(records),
      hydrated: true
    });
  }
}));

export type { PreferencesSnapshot };
