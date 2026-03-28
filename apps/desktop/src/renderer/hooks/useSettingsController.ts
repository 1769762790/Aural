import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SettingKey, SettingValue } from "@aural/domain";
import { defaultSettings, getDefaultSettingValue } from "@renderer/components/settings-catalog";
import { bridge } from "@renderer/lib/bridge";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

type SettingsStateMap = Partial<Record<SettingKey, SettingValue>>;
type PendingMap = Partial<Record<SettingKey, boolean>>;
type ErrorMap = Partial<Record<SettingKey, string | null>>;

const normalizeSnapshot = (records: Array<{ key: SettingKey; value: SettingValue }>) => {
  const next: SettingsStateMap = { ...defaultSettings };
  for (const record of records) {
    next[record.key] = record.value;
  }
  return next;
};

export const useSettingsController = () => {
  const snapshot = usePreferencesStore((state) => state.snapshot);
  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const updatePreference = usePreferencesStore((state) => state.update);
  const [values, setValues] = useState<SettingsStateMap>({});
  const [pending, setPending] = useState<PendingMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const valuesRef = useRef<SettingsStateMap>({});
  const requestVersionRef = useRef<Partial<Record<SettingKey, number>>>({});

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    const next = snapshot as SettingsStateMap;
    setValues(next);
    valuesRef.current = next;
  }, [snapshot]);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const records = await bridge.settings.getAll();
      const next = normalizeSnapshot(records);
      setValues(next);
      valuesRef.current = next;
      hydratePreferences(records);
      setErrors({});
    } finally {
      setIsLoading(false);
    }
  }, [hydratePreferences]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateSetting = useCallback(
    async (key: SettingKey, nextValue: SettingValue) => {
      const version = (requestVersionRef.current[key] ?? 0) + 1;
      requestVersionRef.current[key] = version;
      const previous = valuesRef.current[key] ?? getDefaultSettingValue(key);

      setValues((current) => ({ ...current, [key]: nextValue }));
      valuesRef.current = { ...valuesRef.current, [key]: nextValue };
      updatePreference(key, nextValue);
      setPending((current) => ({ ...current, [key]: true }));
      setErrors((current) => ({ ...current, [key]: null }));

      try {
        await bridge.settings.setSetting(key, nextValue);
        if (requestVersionRef.current[key] === version) {
          setValues((current) => ({ ...current, [key]: nextValue }));
          valuesRef.current = { ...valuesRef.current, [key]: nextValue };
          updatePreference(key, nextValue);
        }
      } catch (caughtError) {
        if (requestVersionRef.current[key] === version) {
          const message = caughtError instanceof Error ? caughtError.message : "Save failed";
          setValues((current) => ({ ...current, [key]: previous }));
          valuesRef.current = { ...valuesRef.current, [key]: previous };
          updatePreference(key, previous);
          setErrors((current) => ({ ...current, [key]: message }));
        }
      } finally {
        if (requestVersionRef.current[key] === version) {
          setPending((current) => ({ ...current, [key]: false }));
        }
      }
    },
    [updatePreference]
  );

  const pendingCount = useMemo(() => Object.values(pending).filter(Boolean).length, [pending]);

  const getValue = useCallback((key: SettingKey) => values[key] ?? getDefaultSettingValue(key), [values]);

  return {
    values,
    errors,
    isLoading,
    pending,
    pendingCount,
    getValue,
    updateSetting,
    refresh
  };
};
