import { useEffect, useMemo, useRef, useState } from "react";
import type { SettingKey, SettingValue, Track } from "@aural/domain";
import { toast } from "@/components/ui/sonner";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { getAccentLabel, isCustomAccentValue, normalizeAccentHex, presetAccentOptions } from "@renderer/lib/accentPalette";
import { bridge } from "@renderer/lib/bridge";
import {
  type Draft,
  type MediaDevicesWithOutputSelection,
  type TabId,
  CUSTOM_ACCENTS_SETTING_KEY,
  LEGACY_CUSTOM_ACCENTS_KEY,
  LEGACY_DRAFT_KEY,
  SETTINGS_CENTER_DRAFT_KEY,
  TAB_SECTION_IDS,
  TABS,
  clamp,
  folderNote,
  isPathWithinFolder,
  defaultDraft,
  parseCustomAccents,
  parseDraft,
  parseScanAllowedFormats
} from "./settings-page.utils";

type SectionRefs = Record<TabId, HTMLElement | null>;

interface UseSettingsPageStateArgs {
  getValue: (key: SettingKey) => SettingValue;
  updateSetting: (key: SettingKey, value: SettingValue) => Promise<void>;
  revision: number;
  markLibraryChanged: () => void;
  currentTrack: Track | null;
  clearPlayback: () => void;
}

export const useSettingsPageState = ({
  getValue,
  updateSetting,
  revision,
  markLibraryChanged,
  currentTrack,
  clearPlayback
}: UseSettingsPageStateArgs) => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const stickyTabsRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<SectionRefs>({ playback: null, library: null, audio: null, appearance: null });
  const tabScrollLockRef = useRef<{ target: TabId | null; timer: number | null }>({ target: null, timer: null });
  const draftHydratedRef = useRef(false);
  const customAccentsHydratedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [customAccents, setCustomAccents] = useState<string[]>([]);
  const [isAccentPickerOpen, setIsAccentPickerOpen] = useState(false);
  const [customAccentDraft, setCustomAccentDraft] = useState("#7c9cff");
  const [blacklistInput, setBlacklistInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isRemovingFolderPath, setIsRemovingFolderPath] = useState<string | null>(null);
  const [folderPathToConfirmRemoval, setFolderPathToConfirmRemoval] = useState<string | null>(null);
  const [systemOutputDevices, setSystemOutputDevices] = useState<Array<{ label: string; value: string }>>([
    { label: "System default", value: "default" }
  ]);
  const [outputDeviceSupported, setOutputDeviceSupported] = useState(false);

  const folders = useAsyncResource(
    () => bridge.library.listFolders({ sortBy: "path", sortDirection: "asc" }),
    [revision],
    `settings:folders:${revision}`
  );

  const getScrollRoot = () => pageRef.current?.closest<HTMLDivElement>('[data-shell-scroll-root="true"]') ?? null;

  const getStickyOffset = () => {
    const stickyHeight = stickyTabsRef.current?.offsetHeight ?? 0;
    return stickyHeight + 16;
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await bridge.settings.getSetting(SETTINGS_CENTER_DRAFT_KEY);
      if (cancelled) {
        return;
      }

      if (typeof stored === "string") {
        setDraft(parseDraft(stored));
        draftHydratedRef.current = true;
        return;
      }

      const legacy = typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_DRAFT_KEY) : null;
      const nextDraft = parseDraft(legacy);
      setDraft(nextDraft);
      draftHydratedRef.current = true;

      if (legacy) {
        void bridge.settings.setSetting(SETTINGS_CENTER_DRAFT_KEY, JSON.stringify(nextDraft));
        try {
          window.localStorage.removeItem(LEGACY_DRAFT_KEY);
        } catch {
          // Ignore legacy cleanup failures.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydratedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void bridge.settings.setSetting(SETTINGS_CENTER_DRAFT_KEY, JSON.stringify(draft));
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draft]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await bridge.settings.getSetting(CUSTOM_ACCENTS_SETTING_KEY);
      if (cancelled) {
        return;
      }

      if (typeof stored === "string") {
        setCustomAccents(parseCustomAccents(stored));
        customAccentsHydratedRef.current = true;
        return;
      }

      const legacy = typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_CUSTOM_ACCENTS_KEY) : null;
      const nextCustomAccents = parseCustomAccents(legacy);
      setCustomAccents(nextCustomAccents);
      customAccentsHydratedRef.current = true;

      if (legacy) {
        void bridge.settings.setSetting(CUSTOM_ACCENTS_SETTING_KEY, JSON.stringify(nextCustomAccents));
        try {
          window.localStorage.removeItem(LEGACY_CUSTOM_ACCENTS_KEY);
        } catch {
          // Ignore legacy cleanup failures.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customAccentsHydratedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void bridge.settings.setSetting(CUSTOM_ACCENTS_SETTING_KEY, JSON.stringify(customAccents));
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [customAccents]);

  useEffect(() => {
    const supported = typeof (HTMLMediaElement.prototype as HTMLMediaElement & { setSinkId?: unknown }).setSinkId === "function";
    setOutputDeviceSupported(supported);

    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let cancelled = false;

    const enumerateOutputDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) {
          return;
        }

        const deduped = new Map<string, { label: string; value: string }>();
        deduped.set("default", { label: "System default", value: "default" });

        let unnamedIndex = 1;
        for (const device of devices) {
          if (device.kind !== "audiooutput") {
            continue;
          }

          const deviceId = device.deviceId || "default";
          if (deduped.has(deviceId)) {
            continue;
          }

          const fallbackLabel = `Output device ${unnamedIndex}`;
          unnamedIndex += 1;
          deduped.set(deviceId, {
            label: device.label?.trim() || fallbackLabel,
            value: deviceId
          });
        }

        setSystemOutputDevices(Array.from(deduped.values()));
      } catch {
        if (!cancelled) {
          setSystemOutputDevices([{ label: "System default", value: "default" }]);
        }
      }
    };

    void enumerateOutputDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateOutputDevices);

    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", enumerateOutputDevices);
    };
  }, []);

  useEffect(() => {
    const root = getScrollRoot();
    if (!root) {
      return;
    }

    const syncActiveTab = () => {
      if (root.scrollTop <= 8) {
        setActiveTab((current) => (current === "appearance" ? current : "appearance"));
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const anchorY = rootRect.top + getStickyOffset();
      let nextTab: TabId | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const tab of TABS) {
        const section = sectionRefs.current[tab.id];
        if (!section) {
          continue;
        }

        const rect = section.getBoundingClientRect();
        const isInView = rect.bottom > rootRect.top + 20 && rect.top < rootRect.bottom - 20;
        if (!isInView) {
          continue;
        }

        const distance = Math.abs(rect.top - anchorY);
        if (distance < bestDistance) {
          bestDistance = distance;
          nextTab = tab.id;
        }
      }

      if (!nextTab) {
        return;
      }

      const lockTarget = tabScrollLockRef.current.target;
      if (lockTarget && nextTab !== lockTarget) {
        return;
      }

      setActiveTab((current) => (current === nextTab ? current : nextTab));
    };

    const observer = new IntersectionObserver(
      () => {
        syncActiveTab();
      },
      {
        root,
        threshold: [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        rootMargin: "-8px 0px -45% 0px"
      }
    );

    TABS.forEach((tab) => {
      const section = sectionRefs.current[tab.id];
      if (!section) {
        return;
      }

      observer.observe(section);
    });

    const onRootScroll = () => {
      const lock = tabScrollLockRef.current;
      if (lock.target) {
        if (lock.timer) {
          window.clearTimeout(lock.timer);
        }

        lock.timer = window.setTimeout(() => {
          tabScrollLockRef.current.target = null;
          tabScrollLockRef.current.timer = null;
          syncActiveTab();
        }, 140);
        return;
      }

      syncActiveTab();
    };

    root.addEventListener("scroll", onRootScroll, { passive: true });
    syncActiveTab();

    return () => {
      root.removeEventListener("scroll", onRootScroll);
      observer.disconnect();
      const lock = tabScrollLockRef.current;
      if (lock.timer) {
        window.clearTimeout(lock.timer);
        lock.timer = null;
      }
      lock.target = null;
    };
  }, []);

  const setDraftValue = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setPersistent = (key: SettingKey, value: SettingValue) => void updateSetting(key, value);

  const scrollTo = (id: TabId) => {
    const root = getScrollRoot();
    if (!root) {
      return;
    }

    const target = root.querySelector<HTMLElement>(`#${TAB_SECTION_IDS[id]}`) ?? sectionRefs.current[id];
    if (!target) {
      return;
    }

    const lock = tabScrollLockRef.current;
    lock.target = id;
    if (lock.timer) {
      window.clearTimeout(lock.timer);
    }
    lock.timer = window.setTimeout(() => {
      tabScrollLockRef.current.target = null;
      tabScrollLockRef.current.timer = null;
    }, 520);

    setActiveTab(id);
    const rootTop = root.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const nextTop = root.scrollTop + (targetTop - rootTop) - getStickyOffset();
    root.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  };

  const addFolders = async () => {
    if (isScanning || isRemovingFolderPath) {
      return;
    }

    try {
      const picked = await bridge.system.chooseFolders();
      if (!picked.length) {
        return;
      }
      await bridge.library.importFolders(picked);
      markLibraryChanged();
      await folders.refresh();
      toast.success(`Added ${picked.length} folder(s) to whitelist`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to add folder(s): ${message}`);
    }
  };

  const rescanFolders = async () => {
    if (isRemovingFolderPath) {
      return;
    }

    setIsScanning(true);
    try {
      const result = await bridge.library.rescanFolders();
      markLibraryChanged();
      await folders.refresh();
      toast.success(`Scanned ${result.scannedFiles} files, imported ${result.importedTracks} tracks`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Scan failed: ${message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const removeFolderFromWhitelist = async (folderPath: string) => {
    setIsRemovingFolderPath(folderPath);
    try {
      const result = await bridge.library.removeFolder(folderPath);
      markLibraryChanged();
      await folders.refresh();

      if (currentTrack && !result.activeFolders.some((activeFolder) => isPathWithinFolder(currentTrack.path, activeFolder))) {
        clearPlayback();
      }

      if (result.removedFromScanList) {
        toast.success(`Removed ${result.folder}. ${result.removedTracks} track(s) were removed from the library.`);
      } else {
        toast.info(`Folder not found in whitelist: ${result.folder}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to remove folder: ${message}`);
    } finally {
      setIsRemovingFolderPath(null);
      setFolderPathToConfirmRemoval(null);
    }
  };

  const appearanceMode = String(getValue("appearance.mode"));
  const followSystemTheme = appearanceMode === "system";
  const accent = String(getValue("appearance.accent"));
  const playbackMode = String(getValue("player.playbackMode"));
  const startupAutoplay = Boolean(getValue("player.startupAutoplay"));
  const shuffleStrategyValue = String(getValue("player.shuffleStrategy"));
  const shuffleStrategy: "true-random" | "anti-repeat" = shuffleStrategyValue === "true-random" ? "true-random" : "anti-repeat";
  const playbackRate = Math.min(3, Math.max(0.5, Number(getValue("player.playbackRate") ?? 1)));
  const replayGainEnabled = Boolean(getValue("player.replayGainEnabled"));
  const channelBalance = clamp(Number(getValue("player.channelBalance") ?? 0), -100, 100);
  const fadeEnabled = Boolean(getValue("player.fadeEnabled") ?? true);
  const fadeMode: "fade" | "crossfade" = getValue("player.fadeMode") === "fade" ? "fade" : "crossfade";
  const crossfadeSeconds = clamp(Number(getValue("player.crossfadeSeconds") ?? 1.5), 0, 5);
  const resume = Boolean(getValue("player.resume"));
  const otherAudioPolicyValue = String(getValue("player.otherAppAudioPolicy"));
  const otherAudioPolicy: "pause" | "duck" | "ignore" =
    otherAudioPolicyValue === "pause" || otherAudioPolicyValue === "duck" || otherAudioPolicyValue === "ignore"
      ? otherAudioPolicyValue
      : "duck";
  const headphoneInsertActionValue = String(getValue("player.headphoneInsertAction"));
  const headphoneInsertAction: "play" | "ignore" =
    headphoneInsertActionValue === "play" || headphoneInsertActionValue === "ignore"
      ? headphoneInsertActionValue
      : "play";
  const headphoneRemoveActionValue = String(getValue("player.headphoneRemoveAction"));
  const headphoneRemoveAction: "pause" | "ignore" =
    headphoneRemoveActionValue === "pause" || headphoneRemoveActionValue === "ignore"
      ? headphoneRemoveActionValue
      : "pause";
  const motion = Boolean(getValue("appearance.motion"));
  const coverColor = Boolean(getValue("appearance.coverColor"));
  const dynamicCoverGradient = getValue("appearance.dynamicCoverGradient") !== false;
  const playerArtworkBreathing = getValue("appearance.playerArtworkBreathing") !== false;
  const autoScanOnStartup = Boolean(getValue("library.autoScanOnStartup"));
  const scanAllowedFormatsSetting = getValue("library.scanAllowedFormats");
  const scanAllowedFormats = useMemo(() => parseScanAllowedFormats(scanAllowedFormatsSetting), [scanAllowedFormatsSetting]);
  const scanMinFileMb = Math.max(0, Number(getValue("library.minFileMb") ?? 1));
  const scanExcludeHiddenFiles = getValue("library.excludeHiddenFiles") !== false;
  const tagEncodingValue = String(getValue("library.tagEncoding") ?? "auto");
  const tagEncoding: "auto" | "utf-8" | "gbk" = tagEncodingValue === "utf-8" || tagEncodingValue === "gbk" ? tagEncodingValue : "auto";
  const allowMetadataEditing = Boolean(getValue("library.allowMetadataEditing"));
  const confirmLocalSourceDeletion = getValue("library.confirmLocalSourceDeletion") !== false;
  const historyLimit = clamp(Number(getValue("history.maxItems") ?? 300), 50, 500);
  const clearHistoryOnExit = getValue("history.clearOnExit") === true;
  const outputDeviceIdValue = String(getValue("player.outputDeviceId") ?? "default");
  const outputDeviceId = outputDeviceIdValue.trim() || "default";
  const channelModeValue = String(getValue("player.channelMode") ?? "stereo");
  const channelMode: "stereo" | "mono" = channelModeValue === "mono" ? "mono" : "stereo";
  const outputDeviceOptions = useMemo(() => {
    if (systemOutputDevices.some((option) => option.value === outputDeviceId)) {
      return systemOutputDevices;
    }

    return [...systemOutputDevices, { label: "Unavailable device", value: outputDeviceId }];
  }, [outputDeviceId, systemOutputDevices]);
  const isFolderMutationBusy = isScanning || Boolean(isRemovingFolderPath);
  const formats = useMemo(() => new Set(scanAllowedFormats), [scanAllowedFormats]);
  const normalizedCustomAccent = normalizeAccentHex(customAccentDraft) ?? "#7c9cff";
  const accentOptions = useMemo(() => {
    const customOptions = customAccents.map((value) => ({
      value,
      label: value.toUpperCase(),
      swatch: value,
      isCustom: true
    }));

    return [...presetAccentOptions.map((item) => ({ ...item, isCustom: false })), ...customOptions];
  }, [customAccents]);
  const activeAccentLabel = getAccentLabel(accent);

  useEffect(() => {
    if (!isCustomAccentValue(accent)) {
      return;
    }

    const normalized = normalizeAccentHex(accent);
    if (!normalized) {
      return;
    }

    setCustomAccents((current) => (current.includes(normalized) ? current : [normalized, ...current].slice(0, 8)));
    setCustomAccentDraft(normalized);
  }, [accent]);

  const saveCustomAccent = () => {
    const normalized = normalizeAccentHex(customAccentDraft);
    if (!normalized) {
      return;
    }

    setCustomAccents((current) => [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8));
    setPersistent("appearance.accent", normalized);
    setIsAccentPickerOpen(false);
  };

  const removeCustomAccent = (value: string) => {
    if (accent === value) {
      return;
    }

    setCustomAccents((current) => current.filter((item) => item !== value));
  };

  const handleOutputDeviceChange = async (nextValue: string) => {
    if (!nextValue) {
      return;
    }

    let resolvedValue = nextValue;
    let resolvedLabel = systemOutputDevices.find((option) => option.value === nextValue)?.label ?? nextValue;
    const mediaDevices = navigator.mediaDevices as MediaDevicesWithOutputSelection | undefined;

    if (nextValue !== "default" && typeof mediaDevices?.selectAudioOutput === "function") {
      try {
        const selected = await mediaDevices.selectAudioOutput({ deviceId: nextValue });
        resolvedValue = selected.deviceId || nextValue;
        resolvedLabel = selected.label?.trim() || resolvedLabel;
        setSystemOutputDevices((current) => {
          const nextOptions = current.filter((option) => option.value !== resolvedValue);
          return [...nextOptions, { label: resolvedLabel, value: resolvedValue }];
        });
      } catch {
        toast.error("Output device selection was cancelled or blocked by the runtime.");
        return;
      }
    }

    await updateSetting("player.outputDeviceId", resolvedValue);
  };

  return {
    pageRef,
    stickyTabsRef,
    sectionRefs,
    activeTab,
    draft,
    customAccents,
    isAccentPickerOpen,
    customAccentDraft,
    blacklistInput,
    isScanning,
    isRemovingFolderPath,
    folderPathToConfirmRemoval,
    outputDeviceSupported,
    folders,
    appearanceMode,
    followSystemTheme,
    accent,
    playbackMode,
    startupAutoplay,
    shuffleStrategy,
    playbackRate,
    replayGainEnabled,
    channelBalance,
    fadeEnabled,
    fadeMode,
    crossfadeSeconds,
    resume,
    otherAudioPolicy,
    headphoneInsertAction,
    headphoneRemoveAction,
    motion,
    coverColor,
    dynamicCoverGradient,
    playerArtworkBreathing,
    autoScanOnStartup,
    scanAllowedFormats,
    scanMinFileMb,
    scanExcludeHiddenFiles,
    tagEncoding,
    allowMetadataEditing,
    confirmLocalSourceDeletion,
    historyLimit,
    clearHistoryOnExit,
    outputDeviceId,
    channelMode,
    outputDeviceOptions,
    isFolderMutationBusy,
    formats,
    normalizedCustomAccent,
    accentOptions,
    activeAccentLabel,
    setDraftValue,
    setPersistent,
    setIsAccentPickerOpen,
    setCustomAccentDraft,
    setBlacklistInput,
    setFolderPathToConfirmRemoval,
    scrollTo,
    addFolders,
    rescanFolders,
    removeFolderFromWhitelist,
    saveCustomAccent,
    removeCustomAccent,
    handleOutputDeviceChange,
    folderNote
  };
};
