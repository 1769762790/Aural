export interface CoverTheme {
  primary: string;
  secondary: string;
  accent: string;
  glowPrimary: string;
  glowSecondary: string;
  glow: string;
  shadow: string;
  overlay: string;
}

export type CoverThemeMode = "light" | "dark";

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const clampUnit = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toRgb = (channels: [number, number, number]) =>
  `rgb(${clampChannel(channels[0])}, ${clampChannel(channels[1])}, ${clampChannel(channels[2])})`;

const toRgba = (channels: [number, number, number], alpha: number) =>
  `rgba(${clampChannel(channels[0])}, ${clampChannel(channels[1])}, ${clampChannel(channels[2])}, ${alpha})`;

const mix = (base: [number, number, number], target: [number, number, number], amount: number): [number, number, number] => [
  base[0] + (target[0] - base[0]) * amount,
  base[1] + (target[1] - base[1]) * amount,
  base[2] + (target[2] - base[2]) * amount
];

const luminance = ([red, green, blue]: [number, number, number]) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

const rgbDistance = (left: [number, number, number], right: [number, number, number]) =>
  Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2
  );

const hueDistance = (left: number, right: number) => {
  const diff = Math.abs(left - right) % 360;
  return diff > 180 ? 360 - diff : diff;
};

const rgbToHsl = ([red, green, blue]: [number, number, number]) => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  return { h: hue * 60, s: saturation, l: lightness };
};

const hueToChannel = (p: number, q: number, t: number) => {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const hue = ((h % 360) + 360) % 360 / 360;
  const saturation = clampUnit(s, 0, 1);
  const lightness = clampUnit(l, 0, 1);

  if (saturation === 0) {
    const channel = lightness * 255;
    return [channel, channel, channel];
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return [
    hueToChannel(p, q, hue + 1 / 3) * 255,
    hueToChannel(p, q, hue) * 255,
    hueToChannel(p, q, hue - 1 / 3) * 255
  ];
};

type ColorBucket = {
  count: number;
  weight: number;
  rgb: [number, number, number];
  hsl: { h: number; s: number; l: number };
};

const resolveThemeMode = (theme?: CoverThemeMode): CoverThemeMode => {
  if (theme) {
    return theme;
  }

  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  return "light";
};

const normalizeTone = (
  channels: [number, number, number],
  role: "primary" | "secondary" | "accent",
  darkMode: boolean
): [number, number, number] => {
  const hsl = rgbToHsl(channels);

  const nextHue = hsl.h;
  const nextSaturation = darkMode
    ? clampUnit(
        hsl.s * (role === "accent" ? 0.96 : 0.88) + 0.04,
        0.18,
        role === "accent" ? 0.74 : 0.62
      )
    : clampUnit(
        hsl.s * (role === "accent" ? 0.78 : 0.7) + 0.03,
        0.1,
        role === "accent" ? 0.48 : 0.38
      );
  const nextLightness = darkMode
    ? clampUnit(
        hsl.l * (role === "secondary" ? 0.78 : 0.92),
        role === "secondary" ? 0.18 : role === "accent" ? 0.44 : 0.24,
        role === "accent" ? 0.64 : 0.56
      )
    : clampUnit(
        hsl.l * 0.62 + (role === "secondary" ? 0.24 : role === "accent" ? 0.06 : 0.18),
        role === "accent" ? 0.34 : 0.68,
        role === "accent" ? 0.52 : role === "secondary" ? 0.84 : 0.8
      );

  const toned = hslToRgb(nextHue, nextSaturation, nextLightness);

  if (darkMode) {
    return role === "secondary"
      ? mix(toned, [14, 18, 34], 0.36)
      : role === "accent"
        ? mix(toned, [212, 222, 255], 0.08)
        : mix(toned, [24, 26, 44], 0.18);
  }

  return role === "secondary"
    ? mix(toned, [241, 237, 248], 0.28)
    : role === "accent"
      ? mix(toned, [52, 58, 84], 0.22)
      : mix(toned, [248, 245, 241], 0.18);
};

const deriveSecondary = (primary: [number, number, number], darkMode: boolean) => {
  const hsl = rgbToHsl(primary);
  return normalizeTone(
    hslToRgb(
      hsl.h + (darkMode ? 42 : 34),
      clampUnit(hsl.s * 0.82 + 0.06, 0.14, 0.58),
      darkMode ? clampUnit(hsl.l * 0.84, 0.18, 0.46) : clampUnit(hsl.l + 0.08, 0.58, 0.82)
    ),
    "secondary",
    darkMode
  );
};

const fallbackThemes: Record<CoverThemeMode, CoverTheme> = {
  dark: {
    primary: "rgb(104, 85, 188)",
    secondary: "rgb(66, 44, 120)",
    accent: "rgb(142, 122, 222)",
    glowPrimary: "rgba(140, 118, 226, 0.28)",
    glowSecondary: "rgba(112, 82, 196, 0.22)",
    glow: "rgba(140, 118, 226, 0.28)",
    shadow: "rgba(15, 18, 34, 0.9)",
    overlay: "rgba(13, 16, 28, 0.7)"
  },
  light: {
    primary: "rgb(205, 197, 238)",
    secondary: "rgb(235, 228, 246)",
    accent: "rgb(152, 124, 220)",
    glowPrimary: "rgba(182, 164, 238, 0.2)",
    glowSecondary: "rgba(214, 202, 245, 0.16)",
    glow: "rgba(182, 164, 238, 0.2)",
    shadow: "rgba(196, 186, 223, 0.52)",
    overlay: "rgba(250, 246, 241, 0.64)"
  }
};

const pickDualTone = (buckets: ColorBucket[], darkMode: boolean) => {
  const [primaryBucket] = buckets;
  if (!primaryBucket) {
    return {
      primary: normalizeTone([108, 78, 216], "primary", darkMode),
      secondary: normalizeTone([46, 28, 94], "secondary", darkMode)
    };
  }

  const primary = normalizeTone(primaryBucket.rgb, "primary", darkMode);
  const primaryHsl = rgbToHsl(primaryBucket.rgb);
  const secondaryBucket = buckets.find((bucket, index) => {
    if (index === 0) {
      return false;
    }

    const distance = rgbDistance(primaryBucket.rgb, bucket.rgb);
    const hueGap = hueDistance(primaryHsl.h, bucket.hsl.h);
    const lightnessGap = Math.abs(primaryHsl.l - bucket.hsl.l);
    return distance > 58 || hueGap > 24 || lightnessGap > 0.16;
  });

  const secondary = secondaryBucket
    ? normalizeTone(secondaryBucket.rgb, "secondary", darkMode)
    : deriveSecondary(primaryBucket.rgb, darkMode);

  return { primary, secondary };
};

const buildTheme = (
  primarySource: [number, number, number],
  secondarySource: [number, number, number],
  darkMode: boolean
): CoverTheme => {
  const accent = normalizeTone(mix(primarySource, secondarySource, 0.4), "accent", darkMode);
  const glowPrimary = mix(primarySource, darkMode ? [235, 240, 255] : [255, 255, 255], darkMode ? 0.12 : 0.34);
  const glowSecondary = mix(secondarySource, darkMode ? [220, 225, 255] : [255, 255, 255], darkMode ? 0.08 : 0.28);
  const shadow = mix(secondarySource, darkMode ? [8, 10, 20] : [208, 198, 232], darkMode ? 0.74 : 0.52);
  const overlay = darkMode
    ? mix(secondarySource, [8, 10, 18], 0.82)
    : mix(primarySource, [252, 248, 244], 0.78);

  return {
    primary: toRgb(primarySource),
    secondary: toRgb(secondarySource),
    accent: toRgb(accent),
    glowPrimary: toRgba(glowPrimary, darkMode ? 0.28 : 0.22),
    glowSecondary: toRgba(glowSecondary, darkMode ? 0.22 : 0.18),
    glow: toRgba(glowPrimary, darkMode ? 0.28 : 0.22),
    shadow: toRgba(shadow, darkMode ? 0.92 : 0.68),
    overlay: toRgba(overlay, darkMode ? 0.76 : 0.62)
  };
};

export const extractCoverTheme = async (coverUrl: string, theme?: CoverThemeMode): Promise<CoverTheme> => {
  const resolvedTheme = resolveThemeMode(theme);
  const fallbackTheme = fallbackThemes[resolvedTheme];

  if (typeof window === "undefined") {
    return fallbackTheme;
  }

  return new Promise<CoverTheme>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(fallbackTheme);
          return;
        }

        const sampleWidth = 48;
        const sampleHeight = 48;
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

        const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
        const buckets = new Map<string, ColorBucket>();
        const darkMode = resolvedTheme === "dark";

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] ?? 0;
          if (alpha < 36) {
            continue;
          }

          const pixel: [number, number, number] = [
            data[index] ?? 0,
            data[index + 1] ?? 0,
            data[index + 2] ?? 0
          ];
          const brightness = luminance(pixel);
          if (brightness < 14 || brightness > 244) {
            continue;
          }

          const hsl = rgbToHsl(pixel);
          const hueBucket = Math.round(hsl.h / 24);
          const saturationBucket = Math.round(hsl.s * 4);
          const lightnessBucket = Math.round(hsl.l * 4);
          const bucketKey = `${hueBucket}-${saturationBucket}-${lightnessBucket}`;
          const weight =
            (alpha / 255) *
            clampUnit(0.34 + hsl.s * 0.9 + (1 - Math.abs(hsl.l - 0.5)) * 0.35, 0.2, 1.75);

          const currentBucket = buckets.get(bucketKey);
          if (currentBucket) {
            currentBucket.count += 1;
            currentBucket.weight += weight;
            currentBucket.rgb = [
              currentBucket.rgb[0] + pixel[0] * weight,
              currentBucket.rgb[1] + pixel[1] * weight,
              currentBucket.rgb[2] + pixel[2] * weight
            ];
          } else {
            buckets.set(bucketKey, {
              count: 1,
              weight,
              rgb: [pixel[0] * weight, pixel[1] * weight, pixel[2] * weight],
              hsl
            });
          }
        }

        if (buckets.size === 0) {
          resolve(fallbackTheme);
          return;
        }

        const normalizedBuckets = Array.from(buckets.values())
          .map((bucket) => ({
            ...bucket,
            rgb: [
              bucket.rgb[0] / bucket.weight,
              bucket.rgb[1] / bucket.weight,
              bucket.rgb[2] / bucket.weight
            ] as [number, number, number]
          }))
          .sort((left, right) => right.weight - left.weight);

        const { primary, secondary } = pickDualTone(normalizedBuckets, darkMode);
        resolve(buildTheme(primary, secondary, darkMode));
      } catch {
        resolve(fallbackTheme);
      }
    };
    image.onerror = () => resolve(fallbackTheme);
    image.src = coverUrl;
  });
};

export const getFallbackCoverTheme = (theme?: CoverThemeMode) => fallbackThemes[resolveThemeMode(theme)];
