import type { SettingValue } from "@aural/domain";
import type { AuralRepository } from "@aural/data";
import type { TagEncodingPreference } from "./metadata";
import type { ScanRules } from "./scanner";

export const DEFAULT_SCAN_FORMATS = ["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"];

const normalizeFormat = (value: string) => value.trim().toLowerCase().replace(/^\./, "");
const toFiniteNumber = (value: SettingValue, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value: SettingValue, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

export const resolveTagEncoding = (value: SettingValue): TagEncodingPreference =>
  value === "utf-8" || value === "gbk" ? value : "auto";

export const parseAllowedFormats = (value: SettingValue): string[] => {
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
        return parsed.map((item) => normalizeFormat(String(item))).filter(Boolean);
      }
    } catch {
      // Ignore invalid format payload and fallback below.
    }
  }

  return [...DEFAULT_SCAN_FORMATS];
};

export const resolveTagEncodingPreference = (repository: AuralRepository): TagEncodingPreference =>
  resolveTagEncoding(repository.getSetting("library.tagEncoding")?.value ?? "auto");

export const resolveScanRules = (repository: AuralRepository): ScanRules => {
  const allowedFormats = parseAllowedFormats(repository.getSetting("library.scanAllowedFormats")?.value ?? null);
  const minFileMb = Math.max(0, toFiniteNumber(repository.getSetting("library.minFileMb")?.value ?? 1, 1));
  const excludeHidden = toBoolean(repository.getSetting("library.excludeHiddenFiles")?.value ?? true, true);

  return {
    allowedFormats,
    minFileMb,
    excludeHidden
  };
};
