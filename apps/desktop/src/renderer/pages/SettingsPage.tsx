import { useEffect, useMemo, useRef, useState } from "react";
import type { FolderSummary, SettingKey, SettingValue } from "@aural/domain";
import {
  BrushCleaning,
  Check,
  FolderSearch,
  Loader2,
  Palette,
  Plus,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  Volume2,
  WandSparkles,
  X
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPicker, ColorPickerHex, ColorPickerInput } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { getAccentLabel, isCustomAccentValue, normalizeAccentHex, presetAccentOptions } from "@renderer/lib/accentPalette";
import { useSettingsController } from "@renderer/hooks/useSettingsController";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

type TabId = "appearance" | "playback" | "library" | "audio";

type Draft = {
  startupAutoplay: boolean;
  randomStyle: "true-random" | "anti-repeat";
  defaultSpeed: number;
  rememberTrackSpeed: boolean;
  pitchCompensation: boolean;
  otherAudioPolicy: "pause" | "duck" | "ignore";
  headphoneInsert: "play" | "ignore";
  headphoneRemove: "pause" | "ignore";
  blacklistFolders: string[];
  allowedFormats: string[];
  minFileMb: number;
  excludeHidden: boolean;
  incrementalScan: boolean;
  tagEncoding: "auto" | "utf-8" | "gbk";
  allowMetadataEdit: boolean;
  autoOrganize: boolean;
  confirmDeleteSource: boolean;
  historyEnabled: boolean;
  historyLimit: number;
  clearHistoryOnExit: boolean;
  replayGain: boolean;
  eqPreset: "off" | "pop" | "rock" | "classical" | "vocal" | "custom";
  stereoMode: "stereo" | "mono";
  channelBalance: number;
  crossfadeSeconds: number;
  advancedOpen: boolean;
  decoderMode: "hardware" | "software";
  preferredDecoder: "auto" | "lossless" | "compatibility";
  decodeFallback: boolean;
  sampleRate: "auto" | "44.1k" | "48k" | "96k";
  bitDepth: "16" | "24" | "32";
  bitPerfect: boolean;
  vstEnabled: boolean;
  mobileFxBridge: boolean;
  noiseReduction: boolean;
  followSystemLanguage: boolean;
  language: "zh-CN" | "en-US" | "ja-JP";
};

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "appearance", label: "Interface", hint: "Theme and language" },
  { id: "playback", label: "Playback", hint: "Behavior and devices" },
  { id: "library", label: "Library", hint: "Scan and file rules" },
  { id: "audio", label: "Audio", hint: "EQ and output chain" }
];
const TAB_SECTION_IDS: Record<TabId, string> = {
  appearance: "settings-appearance",
  playback: "settings-playback",
  library: "settings-library",
  audio: "settings-audio"
};

const DRAFT_KEY = "aural.settings.center.v3";
const CUSTOM_ACCENTS_KEY = "aural.settings.custom-accents.v1";

const defaultDraft: Draft = {
  startupAutoplay: false,
  randomStyle: "anti-repeat",
  defaultSpeed: 1,
  rememberTrackSpeed: true,
  pitchCompensation: true,
  otherAudioPolicy: "duck",
  headphoneInsert: "play",
  headphoneRemove: "pause",
  blacklistFolders: ["C:\\Users\\s1769\\Documents\\WeChat Files", "C:\\Users\\s1769\\Music\\Voice Records"],
  allowedFormats: ["mp3", "flac", "wav", "ape", "ogg", "wma"],
  minFileMb: 1,
  excludeHidden: true,
  incrementalScan: true,
  tagEncoding: "auto",
  allowMetadataEdit: false,
  autoOrganize: true,
  confirmDeleteSource: true,
  historyEnabled: true,
  historyLimit: 300,
  clearHistoryOnExit: false,
  replayGain: true,
  eqPreset: "vocal",
  stereoMode: "stereo",
  channelBalance: 0,
  crossfadeSeconds: 1.5,
  advancedOpen: false,
  decoderMode: "hardware",
  preferredDecoder: "lossless",
  decodeFallback: true,
  sampleRate: "auto",
  bitDepth: "24",
  bitPerfect: false,
  vstEnabled: false,
  mobileFxBridge: false,
  noiseReduction: true,
  followSystemLanguage: true,
  language: "zh-CN"
};

const loadDraft = (): Draft => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? { ...defaultDraft, ...(JSON.parse(raw) as Partial<Draft>) } : defaultDraft;
  } catch {
    return defaultDraft;
  }
};

const loadCustomAccents = () => {
  try {
    const raw = window.localStorage.getItem(CUSTOM_ACCENTS_KEY);
    if (!raw) {
      return [] as string[];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return [...new Set(parsed.map((value) => normalizeAccentHex(String(value))).filter((value): value is string => Boolean(value)))];
  } catch {
    return [] as string[];
  }
};

const folderNote = (folder: FolderSummary) => `${folder.trackCount} tracks${folder.missingCount ? ` · ${folder.missingCount} repair pending` : ""}`;
const normalizePathForCompare = (value: string) => value.replaceAll("/", "\\").toLowerCase();
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isPathWithinFolder = (filePath: string, folderPath: string) => {
  const normalizedFile = normalizePathForCompare(filePath);
  const normalizedFolder = normalizePathForCompare(folderPath);
  return normalizedFile === normalizedFolder || normalizedFile.startsWith(`${normalizedFolder}\\`);
};
const DEFAULT_SCAN_FORMATS = ["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"];
const normalizeFormat = (value: string) => value.trim().toLowerCase().replace(/^\./, "");
const parseScanAllowedFormats = (value: SettingValue) => {
  if (Array.isArray(value)) {
    const formats = value.map((item) => normalizeFormat(String(item))).filter(Boolean);
    if (formats.length > 0) {
      return [...new Set(formats)];
    }
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        const formats = parsed.map((item) => normalizeFormat(String(item))).filter(Boolean);
        if (formats.length > 0) {
          return [...new Set(formats)];
        }
      }
    } catch {
      // Ignore malformed setting payload and fallback to defaults.
    }
  }

  return [...DEFAULT_SCAN_FORMATS];
};

export const SettingsPage = () => {
  const { getValue, updateSetting, pendingCount, isLoading } = useSettingsController();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const stickyTabsRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<TabId, HTMLElement | null>>({ playback: null, library: null, audio: null, appearance: null });
  const tabScrollLockRef = useRef<{ target: TabId | null; timer: number | null }>({ target: null, timer: null });
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [customAccents, setCustomAccents] = useState<string[]>(loadCustomAccents);
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
  const revision = useLibraryStore((state) => state.revision);
  const markLibraryChanged = useLibraryStore((state) => state.markLibraryChanged);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const clearPlayback = usePlayerStore((state) => state.clearPlayback);
  const folders = useAsyncResource(
    () => bridge.library.listFolders({ sortBy: "path", sortDirection: "asc" }),
    [revision],
    `settings:folders:${revision}`
  );

  const getScrollRoot = () => {
    return pageRef.current?.closest<HTMLDivElement>('[data-shell-scroll-root="true"]') ?? null;
  };

  const getStickyOffset = () => {
    const stickyHeight = stickyTabsRef.current?.offsetHeight ?? 0;
    return stickyHeight + 16;
  };

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_ACCENTS_KEY, JSON.stringify(customAccents));
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

  const setDraftValue = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setPersistent = (key: SettingKey, value: SettingValue) => void updateSetting(key, value);
  const scrollTo = (id: TabId) => {
    const root = getScrollRoot();
    if (!root) {
      return;
    }

    const target =
      root.querySelector<HTMLElement>(`#${TAB_SECTION_IDS[id]}`) ??
      sectionRefs.current[id];
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
      if (!picked.length) return;
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
  const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
  const accent = String(getValue("appearance.accent"));
  const playbackMode = String(getValue("player.playbackMode"));
  const startupAutoplay = Boolean(getValue("player.startupAutoplay"));
  const shuffleStrategyValue = String(getValue("player.shuffleStrategy"));
  const shuffleStrategy = shuffleStrategyValue === "true-random" ? "true-random" : "anti-repeat";
  const playbackRate = Math.min(3, Math.max(0.5, Number(getValue("player.playbackRate") ?? 1)));
  const replayGainEnabled = Boolean(getValue("player.replayGainEnabled"));
  const channelBalance = clamp(Number(getValue("player.channelBalance") ?? 0), -100, 100);
  const fadeEnabled = Boolean(getValue("player.fadeEnabled") ?? true);
  const fadeMode = getValue("player.fadeMode") === "fade" ? "fade" : "crossfade";
  const crossfadeSeconds = clamp(Number(getValue("player.crossfadeSeconds") ?? 1.5), 0, 5);
  const resume = Boolean(getValue("player.resume"));
  const otherAudioPolicyValue = String(getValue("player.otherAppAudioPolicy"));
  const otherAudioPolicy =
    otherAudioPolicyValue === "pause" || otherAudioPolicyValue === "duck" || otherAudioPolicyValue === "ignore"
      ? otherAudioPolicyValue
      : "duck";
  const headphoneInsertActionValue = String(getValue("player.headphoneInsertAction"));
  const headphoneInsertAction =
    headphoneInsertActionValue === "play" || headphoneInsertActionValue === "ignore"
      ? headphoneInsertActionValue
      : "play";
  const headphoneRemoveActionValue = String(getValue("player.headphoneRemoveAction"));
  const headphoneRemoveAction =
    headphoneRemoveActionValue === "pause" || headphoneRemoveActionValue === "ignore"
      ? headphoneRemoveActionValue
      : "pause";
  const motion = Boolean(getValue("appearance.motion"));
  const coverColor = Boolean(getValue("appearance.coverColor"));
  const autoScanOnStartup = Boolean(getValue("library.autoScanOnStartup"));
  const scanAllowedFormatsSetting = getValue("library.scanAllowedFormats");
  const scanAllowedFormats = useMemo(() => parseScanAllowedFormats(scanAllowedFormatsSetting), [scanAllowedFormatsSetting]);
  const scanMinFileMb = Math.max(0, Number(getValue("library.minFileMb") ?? 1));
  const scanExcludeHiddenFiles = getValue("library.excludeHiddenFiles") !== false;
  const tagEncodingValue = String(getValue("library.tagEncoding") ?? "auto");
  const tagEncoding = tagEncodingValue === "utf-8" || tagEncodingValue === "gbk" ? tagEncodingValue : "auto";
  const allowMetadataEditing = Boolean(getValue("library.allowMetadataEditing"));
  const confirmLocalSourceDeletion = getValue("library.confirmLocalSourceDeletion") !== false;
  const historyLimit = clamp(Number(getValue("history.maxItems") ?? 300), 50, 500);
  const clearHistoryOnExit = getValue("history.clearOnExit") === true;
  const outputDeviceIdValue = String(getValue("player.outputDeviceId") ?? "default");
  const outputDeviceId = outputDeviceIdValue.trim() || "default";
  const channelModeValue = String(getValue("player.channelMode") ?? "stereo");
  const channelMode = channelModeValue === "mono" ? "mono" : "stereo";
  const outputDeviceOptions = useMemo(() => {
    if (systemOutputDevices.some((option) => option.value === outputDeviceId)) {
      return systemOutputDevices;
    }

    return [
      ...systemOutputDevices,
      {
        label: "Unavailable device",
        value: outputDeviceId
      }
    ];
  }, [outputDeviceId, systemOutputDevices]);
  const density = String(getValue("library.density"));
  const folderCount = folders.data?.length ?? 0;
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

    return [
      ...presetAccentOptions.map((item) => ({ ...item, isCustom: false })),
      ...customOptions
    ];
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

  return (
    <div ref={pageRef} className="flex flex-col gap-6">
      <div ref={stickyTabsRef} className="sticky top-0 z-20 px-6 pb-4 pt-5">
        <Tabs value={activeTab} orientation="vertical" onValueChange={(value) => scrollTo(value as TabId)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-3 rounded-[22px] border border-border bg-background/55 p-1.5 backdrop-blur-xl">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "h-auto min-w-[180px] flex-1 justify-start rounded-[18px] border border-transparent border-b-0 px-4 py-3 text-left normal-case tracking-normal md:flex-none",
                  "transform-gpu transition-[transform,background-color,border-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  "data-[state=active]:translate-x-1",
                  "data-[state=active]:border-primary/35 data-[state=active]:border-b data-[state=active]:bg-primary data-[state=active]:text-foreground data-[state=active]:shadow-[0_18px_36px_rgba(120,89,255,0.12)]"
                )}
              >
                <div>
                  <p className="text-sm font-semibold tracking-[-0.02em]">{tab.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{tab.hint}</p>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-10 px-6 pb-8">
            <section id={TAB_SECTION_IDS.appearance} data-settings-tab="appearance" ref={(node) => { sectionRefs.current.appearance = node; }} className="scroll-mt-28 space-y-6">
              <Intro icon={Sparkles} eyebrow="Interface" title="" description="Only presentation-layer preferences live here. Theme mode, system following, accent color, and language remain aligned across the app." />
              <div className="grid gap-5 xl:grid-cols-2">
                <Card title="Theme and display" description="Control color, mode, motion, and interface density in one place.">
                  <ToggleRow label="Follow system theme" desc="Automatically switch between light and dark with the OS." checked={followSystemTheme} onChange={(v) => setPersistent("appearance.mode", v ? "system" : "dark")} live />
                  <SegmentRow label="Light / dark mode" desc="Manual theme mode when system following is disabled." value={followSystemTheme ? resolvedTheme : appearanceMode} options={[["Dark", "dark"], ["Light", "light"]]} onChange={(v) => setPersistent("appearance.mode", v)} disabled={followSystemTheme} live />
                  <div className="rounded-[24px] border border-border bg-background/50 p-5">
                    <div className="mb-4 space-y-1">
                      <p className="text-sm font-semibold text-foreground">Custom accent color</p>
                      <p className="text-sm leading-6 text-muted-foreground">Drive primary controls, highlights, and brand atmosphere.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {accentOptions.map((option) => (
                        <div
                          key={option.value}
                          className={cn(
                            "flex items-center gap-1 rounded-full border pr-2 text-sm",
                            accent === option.value
                              ? "border-primary/30 bg-primary/12 text-foreground"
                              : "border-border bg-background/55 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 items-center gap-3 rounded-full px-3 py-2"
                            onClick={() => setPersistent("appearance.accent", option.value)}
                          >
                            <span className="size-5 rounded-full border border-black/5 dark:border-white/10" style={{ background: option.swatch }} />
                            <span className="max-w-[108px] truncate">{option.label}</span>
                            {accent === option.value ? <Check className="size-4 text-primary" /> : null}
                          </button>
                          {option.isCustom && accent !== option.value ? (
                            <button
                              type="button"
                              aria-label={`Delete ${option.label}`}
                              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/55 hover:text-foreground"
                              onClick={() => removeCustomAccent(option.value)}
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <Popover open={isAccentPickerOpen} onOpenChange={setIsAccentPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-3 rounded-full border border-dashed border-primary/30 bg-background/55 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground"
                          >
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/12 text-primary">
                              <Plus className="size-3.5" />
                            </span>
                            Add custom
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" sideOffset={12} className="w-[292px] rounded-[24px] border-border bg-popover/96 p-4 shadow-[0_20px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">Pick a custom accent</p>
                              <p className="text-sm leading-6 text-muted-foreground">This color will join the preset swatches and stay selectable later.</p>
                            </div>
                            <ColorPicker className="w-full overflow-hidden rounded-[20px] border-border bg-background/70 shadow-none">
                              <ColorPickerHex color={normalizedCustomAccent} onChange={setCustomAccentDraft} />
                            </ColorPicker>
                            <div className="flex items-center gap-3 rounded-[18px] border border-border bg-background/70 px-3 py-2">
                              <span className="size-7 rounded-full border border-black/5 dark:border-white/10" style={{ background: normalizedCustomAccent }} />
                              <ColorPickerInput value={customAccentDraft.toUpperCase()} onChange={(e) => setCustomAccentDraft(e.target.value)} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current: {activeAccentLabel}</span>
                              <Button type="button" className="rounded-full" disabled={!normalizeAccentHex(customAccentDraft)} onClick={saveCustomAccent}>
                                Save color
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <SelectRow
                    label="Interface language"
                    desc="Pick a specific UI language manually."
                    value={draft.language}
                    options={[
                      { label: "简体中文", value: "zh-CN" },
                      { label: "English", value: "en-US" },
                      { label: "Japanese", value: "ja-JP" }
                    ]}
                    onChange={(v) => setDraftValue("language", v as Draft["language"])}
                    disabled={draft.followSystemLanguage}
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ToggleRow label="Motion" desc="Reduce global transitions and animation." checked={motion} onChange={(v) => setPersistent("appearance.motion", v)} live />
                    <ToggleRow label="Cover ambience" desc="Allow cover colors to tint the player atmosphere." checked={coverColor} onChange={(v) => setPersistent("appearance.coverColor", v)} live />
                  </div>
                </Card>
              </div>
            </section>

            <section id={TAB_SECTION_IDS.playback} data-settings-tab="playback" ref={(node) => { sectionRefs.current.playback = node; }} className="scroll-mt-28 space-y-6">
              <Intro icon={PlayCircle} eyebrow="Playback" title="" description="Startup restore, random strategy, speed defaults, and headset actions are grouped into one stable control surface." />
              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <Card title="Core playback behavior" description="Control startup state, speed rules, and default queue behavior.">
                  <div className="space-y-2">
                    <ToggleRow
                      label="Startup autoplay"
                      desc="Automatically resume and play the last paused song on app launch."
                      checked={resume && startupAutoplay}
                      onChange={(v) => setPersistent("player.startupAutoplay", v)}
                      live
                      disabled={!resume}
                    />
                    {!resume ? (
                      <p className="px-2 text-xs leading-6 text-muted-foreground">
                        需开启 “从上次位置继续” 才能启用
                      </p>
                    ) : null}
                  </div>
                  <Accordion type="single" collapsible value={fadeEnabled ? "fade-settings" : undefined} className="rounded-[24px] border border-border bg-background/55">
                    <AccordionItem value="fade-settings" className="border-b-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                        <div className="max-w-2xl space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">Enable fade in / out</p>
                            <Badge variant="secondary">Live</Badge>
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">
                            Smoothly fade playback when songs start, pause, resume, or switch.
                          </p>
                        </div>
                        <Switch
                          checked={fadeEnabled}
                          onCheckedChange={(value) => setPersistent("player.fadeEnabled", Boolean(value))}
                          className="data-checked:bg-primary data-unchecked:bg-input/90"
                        />
                      </div>
                      <AccordionContent className="px-5 pb-5">
                        <div className="grid gap-4 rounded-[20px] p-4">
                          <SegmentRow
                            label="Fade mode"
                            desc="Choose between a normal fade and a crossfade-style switch."
                            value={fadeMode}
                            options={[["Normal fade", "fade"], ["Crossfade", "crossfade"]]}
                            onChange={(v) => setPersistent("player.fadeMode", v)}
                            live
                          />
                          <RangeRow
                            label="Fade duration"
                            desc="Adjust the transition time from 300ms to 1500ms."
                            value={Math.round(crossfadeSeconds * 1000)}
                            min={300}
                            max={1500}
                            step={100}
                            suffix="ms"
                            onChange={(v) => setPersistent("player.crossfadeSeconds", Number((v / 1000).toFixed(1)))}
                            live
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <ToggleRow
                    label="Resume from last position"
                    desc="Continue from the last stopped position after restart."
                    checked={resume}
                    onChange={(v) => {
                      setPersistent("player.resume", v);
                      if (!v) {
                        setPersistent("player.startupAutoplay", false);
                      }
                    }}
                    live
                  />
                  <SegmentRow label="Default playback mode" desc="Set queue, repeat-one, or shuffle as the default." value={playbackMode} options={[["Queue", "queue"], ["Repeat one", "repeat-one"], ["Shuffle", "shuffle"]]} onChange={(v) => setPersistent("player.playbackMode", v)} live />
                  <SegmentRow
                    label="Shuffle strategy"
                    desc="Switch between true random and anti-repeat shuffle."
                    value={shuffleStrategy}
                    options={[["True random", "true-random"], ["Anti-repeat", "anti-repeat"]]}
                    onChange={(v) => setPersistent("player.shuffleStrategy", v)}
                    live
                  />
                  <RangeRow
                    label="Default speed"
                    desc="Default playback speed from 0.5x to 3.0x."
                    value={playbackRate}
                    min={0.5}
                    max={3}
                    step={0.1}
                    suffix="x"
                    onChange={(v) => setPersistent("player.playbackRate", Number(v.toFixed(1)))}
                    live
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ToggleRow label="Remember per-track speed" desc="Store the last used speed for each track." checked={draft.rememberTrackSpeed} onChange={(v) => setDraftValue("rememberTrackSpeed", v)} />
                    <ToggleRow label="Pitch compensation" desc="Keep pitch steadier when playback speed changes." checked={draft.pitchCompensation} onChange={(v) => setDraftValue("pitchCompensation", v)} />
                  </div>
                </Card>
                <Card title="Audio focus and devices" description="Make Aural predictable when other apps play sound or when headsets change state.">
                  <SegmentRow
                    label="Other app audio policy"
                    desc="Pause, duck, or ignore when other apps produce sound."
                    value={otherAudioPolicy}
                    options={[["Pause", "pause"], ["Duck", "duck"], ["Ignore", "ignore"]]}
                    onChange={(v) => setPersistent("player.otherAppAudioPolicy", v)}
                    live
                  />
                  <SegmentRow
                    label="Headphone insert"
                    desc="Auto play or ignore when headphones are inserted."
                    value={headphoneInsertAction}
                    options={[["Auto play", "play"], ["Ignore", "ignore"]]}
                    onChange={(v) => setPersistent("player.headphoneInsertAction", v)}
                    live
                  />
                  <SegmentRow
                    label="Headphone remove"
                    desc="Pause or ignore when headphones are removed."
                    value={headphoneRemoveAction}
                    options={[["Pause", "pause"], ["Ignore", "ignore"]]}
                    onChange={(v) => setPersistent("player.headphoneRemoveAction", v)}
                    live
                  />
                </Card>
              </div>
            </section>

            <section id={TAB_SECTION_IDS.library} data-settings-tab="library" ref={(node) => { sectionRefs.current.library = node; }} className="scroll-mt-28 space-y-6">
              <Intro icon={FolderSearch} eyebrow="Library" title="" description="Whitelist folders remain the core, blacklist and scanning rules stay nearby, and higher-risk file actions are isolated." />
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <Card
                  title="Folder scan management"
                  description="Manage whitelist folders, blacklist folders, and scan triggers."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={isFolderMutationBusy}
                        onClick={() => void addFolders()}
                      >
                        Add folder
                      </Button>
                      <Button className="rounded-full" disabled={isFolderMutationBusy} onClick={() => void rescanFolders()}>
                        <RefreshCw className={cn("size-4", isScanning && "animate-spin")} />
                        Manual scan
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Scan whitelist</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">Folders currently included in library scanning.</p>
                    </div>
                    <div className="space-y-2">
                      {folders.data?.length ? (
                        folders.data.map((folder) => {
                          const isRemoving = isRemovingFolderPath === folder.path;
                          return (
                            <div
                              key={folder.path}
                              className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-background/55 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{folder.path}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{folderNote(folder)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-[12px]"
                                disabled={isFolderMutationBusy}
                                onClick={() => setFolderPathToConfirmRemoval(folder.path)}
                                aria-label={`Remove ${folder.path}`}
                              >
                                {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-border bg-background/35 px-4 py-5 text-sm text-muted-foreground">
                          {folders.isLoading ? "Loading folders..." : "Empty"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div><p className="text-sm font-semibold text-foreground">Scan blacklist</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Exclude cache folders, recordings, and other unwanted folders.</p></div>
                    <div className="flex gap-3"><Input value={blacklistInput} onChange={(e) => setBlacklistInput(e.target.value)} placeholder="Add blacklist path" className="rounded-[18px]" /><Button variant="outline" className="rounded-[18px]" onClick={() => { const next = blacklistInput.trim(); if (!next) return; setDraftValue("blacklistFolders", [...draft.blacklistFolders, next]); setBlacklistInput(""); }}>Add</Button></div>
                    <div className="flex flex-wrap gap-2">{draft.blacklistFolders.length ? draft.blacklistFolders.map((folder) => <button key={folder} type="button" className="rounded-full border border-border bg-background/60 px-3 py-2 text-xs text-foreground/80 hover:bg-accent/45" onClick={() => setDraftValue("blacklistFolders", draft.blacklistFolders.filter((item) => item !== folder))}>{folder} <span className="text-muted-foreground">×</span></button>) : <span className="text-sm text-muted-foreground">Empty</span>}</div>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ToggleRow
                      label="Auto scan on startup"
                      desc="Check selected folders for changes during app launch."
                      checked={autoScanOnStartup}
                      onChange={(v) => setPersistent("library.autoScanOnStartup", v)}
                      live
                    />
                    <ToggleRow label="Incremental scan on folder changes" desc="Sync only changed files when folder contents change." checked={draft.incrementalScan} onChange={(v) => setDraftValue("incrementalScan", v)} />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Scan rules</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">Filter by audio format, minimum size, and hidden files.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"].map((format) => {
                        const nextFormats = formats.has(format)
                          ? scanAllowedFormats.filter((item) => item !== format)
                          : [...scanAllowedFormats, format];

                        return (
                          <button
                            key={format}
                            type="button"
                            className={cn(
                              "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
                              formats.has(format)
                                ? "border-primary/30 bg-primary/14 text-primary"
                                : "border-border bg-background/55 text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setPersistent("library.scanAllowedFormats", JSON.stringify(nextFormats))}
                          >
                            {format}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <RangeRow
                        label="Minimum file size"
                        desc="Ignore files smaller than this limit."
                        value={scanMinFileMb}
                        min={0}
                        max={20}
                        step={1}
                        suffix="MB"
                        onChange={(v) => setPersistent("library.minFileMb", Math.max(0, Math.round(v)))}
                      />
                      <ToggleRow
                        label="Exclude hidden files"
                        desc="Skip hidden audio files during scanning."
                        checked={scanExcludeHiddenFiles}
                        onChange={(v) => setPersistent("library.excludeHiddenFiles", v)}
                      />
                    </div>
                  </div>
                </Card>
                <AlertDialog open={Boolean(folderPathToConfirmRemoval)} onOpenChange={(open) => !open && setFolderPathToConfirmRemoval(null)}>
                  <AlertDialogContent className="rounded-[20px] border border-border bg-popover/98">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove folder from scan whitelist?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove this folder from scanning? This does not delete local files.
                        Tracks that are no longer inside any whitelist folder will be removed from library, playlists, favorites, and history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={Boolean(isRemovingFolderPath)}>Cancel</AlertDialogCancel>
                      <Button
                        type="button"
                        disabled={!folderPathToConfirmRemoval || Boolean(isRemovingFolderPath)}
                        onClick={() => {
                          if (!folderPathToConfirmRemoval) {
                            return;
                          }
                          void removeFolderFromWhitelist(folderPathToConfirmRemoval);
                        }}
                      >
                        {isRemovingFolderPath ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Removing...
                          </span>
                        ) : (
                          "Remove folder"
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="grid gap-5">
                  <Card title="Metadata and file management" description="Encoding, metadata write access, and file-level safeguards live together.">
                    <SelectRow
                      label="Tag encoding"
                      desc="Fix legacy metadata text corruption."
                      value={tagEncoding}
                      options={[
                        { label: "Auto detect", value: "auto" },
                        { label: "UTF-8", value: "utf-8" },
                        { label: "GBK", value: "gbk" }
                      ]}
                      onChange={(v) => setPersistent("library.tagEncoding", v)}
                    />
                    <ToggleRow
                      label="Allow metadata editing"
                      desc="Only enable edit actions inside the Songs list."
                      checked={allowMetadataEditing}
                      onChange={(v) => setPersistent("library.allowMetadataEditing", v)}
                    />
                    <ToggleRow
                      label="Auto organize same-name items"
                      desc="Planned for a later pass. Duplicate grouping is not active yet."
                      checked={false}
                      onChange={() => undefined}
                      disabled
                    />
                    <ToggleRow
                      label="Confirm local source deletion"
                      desc="Only applies to the Songs list when deleting source files from device."
                      checked={confirmLocalSourceDeletion}
                      onChange={(v) => setPersistent("library.confirmLocalSourceDeletion", v)}
                    />
                  </Card>
                  <Card title="Playback history and favorites" description="Control history persistence, capacity, and cleanup behavior.">
                    <RangeRow
                      label="Max history items"
                      desc="Limit the amount of history kept in the app."
                      value={historyLimit}
                      min={50}
                      max={500}
                      step={20}
                      suffix=" items"
                      onChange={(v) => setPersistent("history.maxItems", clamp(Math.round(v / 20) * 20, 50, 500))}
                    />
                    <ToggleRow
                      label="Clear history on exit"
                      desc="Automatically purge recent history when the app closes."
                      checked={clearHistoryOnExit}
                      onChange={(v) => setPersistent("history.clearOnExit", v)}
                    />
                  </Card>
                </div>
              </div>
            </section>

            <section id={TAB_SECTION_IDS.audio} data-settings-tab="audio" ref={(node) => { sectionRefs.current.audio = node; }} className="scroll-mt-28 space-y-6">
              <Intro icon={Volume2} eyebrow="Audio" title="" description="ReplayGain, EQ, channel control, and fade timing stay visible. Decoder and output routing remain folded under advanced controls." />
              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <Card title="Base quality settings" description="Keep perceived loudness, EQ color, and stereo behavior under control.">
                  <ToggleRow
                    label="ReplayGain"
                    desc="Balance loudness between tracks automatically."
                    checked={replayGainEnabled}
                    onChange={(v) => setPersistent("player.replayGainEnabled", v)}
                    live
                  />
                  <SegmentRow label="EQ preset" desc="Switch between common tonal presets or custom mode." value={draft.eqPreset} options={[["Off", "off"], ["Pop", "pop"], ["Rock", "rock"], ["Classical", "classical"], ["Vocal", "vocal"], ["Custom", "custom"]]} onChange={(v) => setDraftValue("eqPreset", v as Draft["eqPreset"])} />
                  <SegmentRow
                    label="Channel mode"
                    desc="Switch between stereo and mono."
                    value={channelMode}
                    options={[["Stereo", "stereo"], ["Mono", "mono"]]}
                    onChange={(v) => setPersistent("player.channelMode", v)}
                    live
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <RangeRow
                      label="Left / right balance"
                      desc="Shift playback center left or right."
                      value={channelBalance}
                      min={-100}
                      max={100}
                      step={5}
                      suffix="%"
                      onChange={(v) => setPersistent("player.channelBalance", clamp(Math.round(v / 5) * 5, -100, 100))}
                      live
                    />
                    <RangeRow
                      label="Fade duration"
                      desc="Control the crossfade duration from 0 to 5 seconds."
                      value={crossfadeSeconds}
                      min={0}
                      max={5}
                      step={0.5}
                      suffix="s"
                      onChange={(v) => setPersistent("player.crossfadeSeconds", clamp(Number(v.toFixed(1)), 0, 5))}
                      live
                    />
                  </div>
                </Card>
                <Card title="Advanced quality settings" description="Decoder behavior, output routing, and plugin hooks stay hidden until needed.">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <SegmentRow label="Decoder mode" desc="Switch between hardware and software decode." value={draft.decoderMode} options={[["Hardware", "hardware"], ["Software", "software"]]} onChange={(v) => setDraftValue("decoderMode", v as Draft["decoderMode"])} />
                      <SelectRow
                        label="Preferred decode profile"
                        desc="Bias toward lossless or compatibility."
                        value={draft.preferredDecoder}
                        options={[
                          { label: "Auto", value: "auto" },
                          { label: "Lossless first", value: "lossless" },
                          { label: "Compatibility first", value: "compatibility" }
                        ]}
                        onChange={(v) => setDraftValue("preferredDecoder", v as Draft["preferredDecoder"])}
                      />
                    </div>
                    <ToggleRow label="Automatic downgrade" desc="Fallback to safer decode path when formats are incompatible." checked={draft.decodeFallback} onChange={(v) => setDraftValue("decodeFallback", v)} />
                    <div className="grid gap-4 xl:grid-cols-3">
                      <SelectRow
                        label="Output device"
                        desc={
                          outputDeviceSupported
                            ? "Pick the audio output channel."
                            : "Output device switching is not supported in this runtime."
                        }
                        value={outputDeviceId}
                        options={outputDeviceOptions}
                        onChange={(v) => setPersistent("player.outputDeviceId", v)}
                        disabled={!outputDeviceSupported}
                      />
                      <SelectRow
                        label="Sample rate"
                        desc="Choose the output sample rate."
                        value={draft.sampleRate}
                        options={[
                          { label: "Auto", value: "auto" },
                          { label: "44.1 kHz", value: "44.1k" },
                          { label: "48 kHz", value: "48k" },
                          { label: "96 kHz", value: "96k" }
                        ]}
                        onChange={(v) => setDraftValue("sampleRate", v as Draft["sampleRate"])}
                      />
                      <SelectRow
                        label="Bit depth"
                        desc="Choose output bit depth."
                        value={draft.bitDepth}
                        options={[
                          { label: "16 bit", value: "16" },
                          { label: "24 bit", value: "24" },
                          { label: "32 bit", value: "32" }
                        ]}
                        onChange={(v) => setDraftValue("bitDepth", v as Draft["bitDepth"])}
                      />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <ToggleRow label="Bit perfect" desc="Keep a cleaner direct output path when possible." checked={draft.bitPerfect} onChange={(v) => setDraftValue("bitPerfect", v)} />
                      <ToggleRow label="VST plugin management" desc="Enable desktop VST effect expansion." checked={draft.vstEnabled} onChange={(v) => setDraftValue("vstEnabled", v)} />
                      <ToggleRow label="Noise reduction" desc="Reduce low-level background noise." checked={draft.noiseReduction} onChange={(v) => setDraftValue("noiseReduction", v)} />
                    </div>
                </Card>
              </div>
            </section>
      </div>
    </div>
  );
};

const Intro = ({ icon: Icon, eyebrow, title, description }: { icon: React.ComponentType<{ className?: string }>; eyebrow: string; title: string; description: string }) => (
  <div className="space-y-3"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-[18px] border border-primary/16 bg-primary/12 text-primary"><Icon className="size-5" /></span><div><p className="text-[16px] font-semibold uppercase tracking-[0.32em] text-primary">{eyebrow}</p></div></div><p className="max-w-full text-sm leading-7 text-muted-foreground">{description}</p></div>
);

const Card = ({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="rounded-[30px] border border-border bg-background/58 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-background/45 dark:shadow-[0_20px_60px_rgba(0,0,0,0.16)]"><div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><TooltipProvider delayDuration={180}><Tooltip><TooltipTrigger asChild><h3 className="w-fit cursor-help text-xl font-bold tracking-[-0.04em] text-foreground">{title}</h3></TooltipTrigger><TooltipContent side="top" className="max-w-sm rounded-[14px] border border-border bg-popover px-3 py-2 text-sm leading-6 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.14)]">{description}</TooltipContent></Tooltip></TooltipProvider></div>{action}</div><div className="space-y-4">{children}</div></div>
);

const ToggleRow = ({
  label,
  desc,
  checked,
  onChange,
  live = false,
  disabled = false
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  live?: boolean;
  disabled?: boolean;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-border bg-background/55 px-5 py-4">
    <div className="max-w-2xl space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {live ? <Badge variant="secondary">Live</Badge> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onChange(Boolean(value))}
      className="data-checked:bg-primary data-unchecked:bg-input/90"
    />
  </div>
);

const SegmentRow = ({ label, desc, value, options, onChange, live = false, disabled = false }: { label: string; desc: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void; live?: boolean; disabled?: boolean }) => (
  <div className="rounded-[24px] border border-border bg-background/55 p-5"><div className="mb-4 space-y-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-foreground">{label}</p>{live ? <Badge variant="secondary">Live</Badge> : null}</div><p className="text-sm leading-6 text-muted-foreground">{desc}</p></div><div className={cn("grid gap-2 rounded-[20px] bg-background/85 p-2", options.length > 3 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3")}>{options.map(([text, optionValue]) => <button key={optionValue} type="button" disabled={disabled} className={cn("rounded-[16px] px-4 py-3 text-sm font-semibold transition-all", value === optionValue ? "bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(120,89,255,0.2)]" : "bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground", disabled && "cursor-not-allowed opacity-60")} onClick={() => onChange(optionValue)}>{text}</button>)}</div></div>
);

const RangeRow = ({
  label,
  desc,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  live = false
}: {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
  live?: boolean;
}) => (
  <div className="rounded-[24px] border border-border bg-background/55 p-5">
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {live ? <Badge variant="secondary">Live</Badge> : null}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
      </div>
      <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/72">
        {Number.isInteger(value) ? value : value.toFixed(1)}
        {suffix}
      </span>
    </div>
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(values) => {
        const next = values[0];
        if (typeof next === "number" && Number.isFinite(next)) {
          onChange(next);
        }
      }}
      className="w-full"
    />
  </div>
);

const SelectRow = ({
  label,
  desc,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string;
  desc: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const activeLabel = options.find((option) => option.value === value)?.label ?? "";

  return (
    <div className="rounded-[24px] border border-border bg-background/55 p-5">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
      </div>

      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)} disabled={disabled}>
        <SelectTrigger className="h-12 w-full rounded-[18px] border-border bg-background px-4 text-sm text-foreground shadow-none hover:bg-background/95">
          <SelectValue placeholder="Select language">{activeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          side="bottom"
          sideOffset={10}
          className="rounded-[18px] border border-border bg-popover/96 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.14)] backdrop-blur-xl"
        >
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="rounded-[12px] px-3 py-2.5 text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
