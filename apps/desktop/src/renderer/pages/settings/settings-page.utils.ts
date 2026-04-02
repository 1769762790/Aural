import type { FolderSummary, SettingValue } from "@aural/domain";

export type TabId = "appearance" | "playback" | "library" | "audio";

export type Draft = {
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

export type MediaDevicesWithOutputSelection = MediaDevices & {
  selectAudioOutput?: (options?: { deviceId?: string }) => Promise<MediaDeviceInfo>;
};

export const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "appearance", label: "Interface", hint: "Theme and language" },
  { id: "playback", label: "Playback", hint: "Behavior and devices" },
  { id: "library", label: "Library", hint: "Scan and file rules" },
  { id: "audio", label: "Audio", hint: "EQ and output chain" }
];

export const TAB_SECTION_IDS: Record<TabId, string> = {
  appearance: "settings-appearance",
  playback: "settings-playback",
  library: "settings-library",
  audio: "settings-audio"
};

export const SETTINGS_CENTER_DRAFT_KEY = "settings.centerDraft";
export const CUSTOM_ACCENTS_SETTING_KEY = "appearance.customAccents";
export const LEGACY_DRAFT_KEY = "aural.settings.center.v3";
export const LEGACY_CUSTOM_ACCENTS_KEY = "aural.settings.custom-accents.v1";

export const defaultDraft: Draft = {
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

export const parseDraft = (raw: string | null | undefined): Draft => {
  try {
    return raw ? { ...defaultDraft, ...(JSON.parse(raw) as Partial<Draft>) } : defaultDraft;
  } catch {
    return defaultDraft;
  }
};

export const parseCustomAccents = (raw: string | null | undefined) => {
  try {
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

export const folderNote = (folder: FolderSummary) =>
  `${folder.trackCount} tracks${folder.missingCount ? ` · ${folder.missingCount} repair pending` : ""}`;

export const normalizePathForCompare = (value: string) => value.replaceAll("/", "\\").toLowerCase();

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const isPathWithinFolder = (filePath: string, folderPath: string) => {
  const normalizedFile = normalizePathForCompare(filePath);
  const normalizedFolder = normalizePathForCompare(folderPath);
  return normalizedFile === normalizedFolder || normalizedFile.startsWith(`${normalizedFolder}\\`);
};

export const DEFAULT_SCAN_FORMATS = ["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"];

export const normalizeFormat = (value: string) => value.trim().toLowerCase().replace(/^\./, "");

export const parseScanAllowedFormats = (value: SettingValue) => {
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

export const normalizeAccentHex = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!/^#?[0-9a-f]{6}$/.test(normalized)) {
    return null;
  }

  return normalized.startsWith("#") ? normalized : `#${normalized}`;
};
