export interface AccentPalette {
  accent: string;
  accentStrong: string;
  accentSoft: string;
}

export const presetAccentPalettes = {
  aurora: {
    accent: "#8ac7ff",
    accentStrong: "#52a5ff",
    accentSoft: "rgba(138, 199, 255, 0.16)"
  },
  ember: {
    accent: "#ffb36a",
    accentStrong: "#ff8752",
    accentSoft: "rgba(255, 179, 106, 0.18)"
  },
  pine: {
    accent: "#84d7b0",
    accentStrong: "#4db58a",
    accentSoft: "rgba(132, 215, 176, 0.18)"
  },
  tide: {
    accent: "#6ea7ff",
    accentStrong: "#4c82ff",
    accentSoft: "rgba(110, 167, 255, 0.18)"
  }
} as const;

export type PresetAccentKey = keyof typeof presetAccentPalettes;

export const presetAccentOptions = [
  { value: "aurora", label: "aurora", swatch: presetAccentPalettes.aurora.accent },
  { value: "ember", label: "ember", swatch: presetAccentPalettes.ember.accent },
  { value: "pine", label: "pine", swatch: presetAccentPalettes.pine.accent },
  { value: "tide", label: "tide", swatch: presetAccentPalettes.tide.accent }
] as const;

const hexPattern = /^#?[0-9a-f]{6}$/i;

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (value: string) => {
  const normalized = normalizeAccentHex(value);
  if (!normalized) {
    return null;
  }

  const hex = normalized.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;

const mixHex = (base: string, target: string, amount: number) => {
  const sourceRgb = hexToRgb(base);
  const targetRgb = hexToRgb(target);
  if (!sourceRgb || !targetRgb) {
    return base;
  }

  return rgbToHex({
    r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount,
    g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount,
    b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount
  });
};

export const normalizeAccentHex = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!hexPattern.test(trimmed)) {
    return null;
  }

  return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
};

export const isPresetAccentKey = (value: string): value is PresetAccentKey => value in presetAccentPalettes;

export const isCustomAccentValue = (value: string | null | undefined) => {
  const normalized = normalizeAccentHex(value);
  return Boolean(normalized && !isPresetAccentKey(normalized));
};

export const buildCustomAccentPalette = (value: string): AccentPalette => {
  const normalized = normalizeAccentHex(value) ?? presetAccentPalettes.aurora.accent;
  const rgb = hexToRgb(normalized);

  if (!rgb) {
    return presetAccentPalettes.aurora;
  }

  return {
    accent: normalized,
    accentStrong: mixHex(normalized, "#000000", 0.18),
    accentSoft: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`
  };
};

export const resolveAccentPalette = (value: string | null | undefined): AccentPalette => {
  if (value && isPresetAccentKey(value)) {
    return presetAccentPalettes[value];
  }

  const normalized = normalizeAccentHex(value);
  if (normalized) {
    return buildCustomAccentPalette(normalized);
  }

  return presetAccentPalettes.aurora;
};

export const getAccentLabel = (value: string | null | undefined) => {
  if (!value) {
    return "aurora";
  }

  if (isPresetAccentKey(value)) {
    return value;
  }

  const normalized = normalizeAccentHex(value);
  return normalized ? "custom" : "aurora";
};
