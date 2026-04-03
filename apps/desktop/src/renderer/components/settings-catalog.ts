import type { SettingKey, SettingValue } from "@aural/domain";

export type SettingsFieldKind = "toggle" | "segmented" | "slider" | "swatches";

export interface SettingsOption {
  label: string;
  value: SettingValue;
  swatch?: string;
}

export interface SettingsFieldDefinition {
  key: SettingKey;
  label: string;
  description: string;
  kind: SettingsFieldKind;
  options?: SettingsOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SettingsSectionDefinition {
  title: string;
  description: string;
  fields: SettingsFieldDefinition[];
}

export const defaultSettings: Record<SettingKey, SettingValue> = {
  "appearance.mode": "system",
  "appearance.accent": "aurora",
  "appearance.customAccents": null,
  "appearance.motion": true,
  "appearance.coverColor": true,
  "appearance.dynamicCoverGradient": true,
  "appearance.playerArtworkBreathing": true,
  "player.volume": 0.8,
  "player.startupAutoplay": false,
  "player.replayGainEnabled": true,
  "player.playbackRate": 1,
  "player.playbackMode": "queue",
  "player.shuffleStrategy": "anti-repeat",
  "player.outputDeviceId": "default",
  "player.channelMode": "stereo",
  "player.channelBalance": 0,
  "player.fadeEnabled": true,
  "player.fadeMode": "crossfade",
  "player.crossfadeSeconds": 1.5,
  "player.session": null,
  "player.resume": true,
  "player.otherAppAudioPolicy": "duck",
  "player.headphoneInsertAction": "play",
  "player.headphoneRemoveAction": "pause",
  "lyrics.enabled": true,
  "lyrics.align": "center",
  "library.autoScanOnStartup": true,
  "library.scanAllowedFormats": JSON.stringify(["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"]),
  "library.minFileMb": 1,
  "library.excludeHiddenFiles": true,
  "library.tagEncoding": "auto",
  "library.allowMetadataEditing": false,
  "library.confirmLocalSourceDeletion": true,
  "history.maxItems": 300,
  "history.clearOnExit": false,
  "library.density": "default",
  "settings.centerDraft": null,
  "online.enabled": true,
  "online.providerBaseUrl": null,
  "online.preferDownloadedCopy": true,
  "online.downloadDirectory": null,
  "online.neteaseCookie": null,
  "online.lastMode": "local"
};

export const settingsSections: SettingsSectionDefinition[] = [
  {
    title: "Appearance",
    description: "Keep theme mode, accent, motion, and cover ambience inside one visual system so Aural feels coherent.",
    fields: [
      {
        key: "appearance.mode",
        label: "Theme mode",
        description: "Choose whether the app follows the system, stays light, or stays dark.",
        kind: "segmented",
        options: [
          { label: "System", value: "system" },
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" }
        ]
      },
      {
        key: "appearance.accent",
        label: "Accent",
        description: "Pick the stable brand color used across controls and ambient highlights.",
        kind: "swatches",
        options: [
          { label: "Aurora", value: "aurora", swatch: "#8ac7ff" },
          { label: "Ember", value: "ember", swatch: "#ffb36a" },
          { label: "Pine", value: "pine", swatch: "#84d7b0" },
          { label: "Tide", value: "tide", swatch: "#6ea7ff" }
        ]
      },
      {
        key: "appearance.motion",
        label: "Motion",
        description: "Reduce transitions and animations for a quieter desktop feel.",
        kind: "toggle"
      },
      {
        key: "appearance.coverColor",
        label: "Cover ambience",
        description: "Allow the player surface to keep richer color and saturation around cover-driven artwork.",
        kind: "toggle"
      },
      {
        key: "appearance.dynamicCoverGradient",
        label: "Dynamic cover gradient",
        description: "Let the main player scene follow cover art with a softer dual-tone gradient background.",
        kind: "toggle"
      },
      {
        key: "appearance.playerArtworkBreathing",
        label: "Artwork breathing",
        description: "Let the main player cover shadow breathe gently while playback is active.",
        kind: "toggle"
      }
    ]
  },
  {
    title: "Playback",
    description: "Playback defaults should be direct and predictable, especially when new queues are started from different pages.",
    fields: [
      {
        key: "player.volume",
        label: "Default volume",
        description: "Set the initial playback volume used when the app starts and when new queues are created.",
        kind: "slider",
        min: 0,
        max: 100,
        step: 1,
        unit: "%"
      },
      {
        key: "player.playbackMode",
        label: "Default playback mode",
        description: "Choose how fresh queues begin: in order, shuffled, or locked to one track.",
        kind: "segmented",
        options: [
          { label: "Queue", value: "queue" },
          { label: "Shuffle", value: "shuffle" },
          { label: "Repeat one", value: "repeat-one" }
        ]
      },
      {
        key: "player.playbackRate",
        label: "Default speed",
        description: "Set playback speed from 0.5x to 3.0x with immediate effect.",
        kind: "slider",
        min: 0.5,
        max: 3,
        step: 0.1,
        unit: "x"
      },
      {
        key: "player.resume",
        label: "Resume last session",
        description: "Prepare for restart recovery by persisting the previous playback context.",
        kind: "toggle"
      }
    ]
  },
  {
    title: "Lyrics",
    description: "Lyrics should complement playback without overpowering the rest of the player page.",
    fields: [
      {
        key: "lyrics.enabled",
        label: "Show lyrics",
        description: "Hide the lyrics surface without affecting playback itself.",
        kind: "toggle"
      },
      {
        key: "lyrics.align",
        label: "Lyric alignment",
        description: "Control whether lyric lines sit on the left edge or center axis of the player page.",
        kind: "segmented",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" }
        ]
      }
    ]
  },
  {
    title: "Density",
    description: "Balance high-density library views with a more spacious player by choosing a stable global rhythm.",
    fields: [
      {
        key: "library.density",
        label: "Interface density",
        description: "Adjust spacing in list-heavy areas and shared panels across the app.",
        kind: "segmented",
        options: [
          { label: "Compact", value: "compact" },
          { label: "Default", value: "default" },
          { label: "Roomy", value: "roomy" }
        ]
      }
    ]
  }
];

export const settingsFieldLookup = new Map(
  settingsSections.flatMap((section) => section.fields).map((field) => [field.key, field] as const)
);

export const getDefaultSettingValue = (key: SettingKey): SettingValue => defaultSettings[key];

export const getSettingField = (key: SettingKey) => settingsFieldLookup.get(key) ?? null;

export const formatSettingValue = (key: SettingKey, value: SettingValue | undefined) => {
  const field = getSettingField(key);
  const effectiveValue = value ?? getDefaultSettingValue(key);

  if (!field) {
    return String(effectiveValue ?? "Unset");
  }

  if (field.kind === "toggle") {
    return effectiveValue ? "Enabled" : "Disabled";
  }

  if (key === "player.volume") {
    return `${Math.round(Number(effectiveValue ?? 0) * 100)}%`;
  }

  if (key === "player.playbackRate") {
    const rate = Number(effectiveValue ?? 1);
    return `${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(1)}x`;
  }

  const option = field.options?.find((item) => item.value === effectiveValue);
  return option?.label ?? String(effectiveValue ?? "Unset");
};
