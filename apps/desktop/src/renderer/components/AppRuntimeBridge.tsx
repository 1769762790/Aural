import { useEffect, useRef } from "react";
import type { ThemeMode } from "@aural/domain";
import { defaultSettings } from "@renderer/components/settings-catalog";
import { resolveAccentPalette } from "@renderer/lib/accentPalette";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

const resolveThemeMode = (mode: ThemeMode, mediaQuery: MediaQueryList) =>
  mode === "system" ? (mediaQuery.matches ? "dark" : "light") : mode;

let startupRescanTriggered = false;
let startupPlaybackRestoreTriggered = false;

const applyRuntimeAppearance = (root: HTMLElement, snapshot: ReturnType<typeof usePreferencesStore.getState>["snapshot"]) => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const themeMode = (snapshot["appearance.mode"] ?? defaultSettings["appearance.mode"]) as ThemeMode;
  const resolvedTheme = resolveThemeMode(themeMode, mediaQuery);
  const accentValue = String(snapshot["appearance.accent"] ?? defaultSettings["appearance.accent"]);
  const accent = resolveAccentPalette(accentValue);
  const density = String(snapshot["library.density"] ?? defaultSettings["library.density"]);
  const motion = snapshot["appearance.motion"] === false ? "off" : "on";
  const coverColor = snapshot["appearance.coverColor"] === false ? "off" : "on";

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.toggle("light", resolvedTheme === "light");
  root.dataset.auralTheme = resolvedTheme;
  root.dataset.auralDensity = density;
  root.dataset.auralMotion = motion;
  root.dataset.auralCoverColor = coverColor;
  root.style.setProperty("--aural-accent", accent.accent);
  root.style.setProperty("--aural-accent-strong", accent.accentStrong);
  root.style.setProperty("--aural-accent-soft", accent.accentSoft);
  root.style.setProperty("--primary", accent.accent);
  root.style.setProperty("--ring", accent.accentStrong);
  root.style.setProperty("--accent", accent.accentSoft);
  root.style.setProperty("--sidebar-accent", accent.accentSoft);
  root.style.setProperty("--sidebar-border", accent.accentSoft);
  root.style.colorScheme = resolvedTheme;
  usePreferencesStore.getState().setResolvedTheme(resolvedTheme);
  void bridge.system.setTitleBarTheme(resolvedTheme);
};

export const AppRuntimeBridge = () => {
  const snapshot = usePreferencesStore((state) => state.snapshot);
  const hydrated = usePreferencesStore((state) => state.hydrated);
  const load = usePreferencesStore((state) => state.load);
  const markLibraryChanged = useLibraryStore((state) => state.markLibraryChanged);
  const previousSnapshotRef = useRef<typeof snapshot | null>(null);

  useEffect(() => {
    if (!hydrated) {
      void load();
    }
  }, [hydrated, load]);

  useEffect(() => {
    if (!hydrated || startupRescanTriggered) {
      return;
    }

    const shouldAutoRescanOnStartup = snapshot["library.autoScanOnStartup"] !== false;
    startupRescanTriggered = true;

    if (!shouldAutoRescanOnStartup) {
      return;
    }

    let cancelled = false;

    void bridge.library
      .rescanFolders()
      .then(() => {
        if (!cancelled) {
          markLibraryChanged();
        }
      })
      .catch(() => {
        // Ignore startup rescan failures and keep the shell responsive.
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, markLibraryChanged, snapshot]);

  useEffect(() => {
    if (!hydrated || startupPlaybackRestoreTriggered) {
      return;
    }

    startupPlaybackRestoreTriggered = true;

    if (snapshot["player.resume"] === false) {
      return;
    }

    void usePlayerStore.getState().restoreSession({
      autoplay: snapshot["player.startupAutoplay"] === true
    });
  }, [hydrated, snapshot]);

  useEffect(() => {
    const root = document.documentElement;
    applyRuntimeAppearance(root, snapshot);

    const previousSnapshot = previousSnapshotRef.current;
    const changedPreferences = previousSnapshot
      ? Object.fromEntries(
          Object.entries(snapshot).filter(([key, value]) => previousSnapshot[key as keyof typeof previousSnapshot] !== value)
        )
      : snapshot;

    usePlayerStore.getState().applyPreferences(changedPreferences);
    previousSnapshotRef.current = snapshot;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyRuntimeAppearance(root, usePreferencesStore.getState().snapshot);

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [snapshot]);

  return null;
};
