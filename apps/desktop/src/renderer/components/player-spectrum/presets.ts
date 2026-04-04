import type { SpectrumPalette, SpectrumStylePreset, SpectrumVariant } from "./types";

export const spectrumPalette: SpectrumPalette = {
  barStart: "color-mix(in srgb, var(--primary) 96%, #f8fafc)",
  barEnd: "color-mix(in srgb, var(--primary) 28%, #f8fafc)",
  glow: "color-mix(in srgb, var(--primary) 48%, transparent)",
  rail: "color-mix(in srgb, var(--player-line) 56%, transparent)"
};

export const spectrumStylePresets: Record<SpectrumVariant, SpectrumStylePreset> = {
  "bars-classic": {
    variant: "bars-classic",
    barCount: 64,
    minHeightPx: 2,
    maxHeightPx: 42,
    gapPx: 2,
    radiusPx: 999,
    blurPx: 0,
    opacity: 1
  },
  "bars-soft-glow": {
    variant: "bars-soft-glow",
    barCount: 64,
    minHeightPx: 2,
    maxHeightPx: 42,
    gapPx: 2,
    radiusPx: 999,
    blurPx: 2,
    opacity: 1
  },
  "wave-line": {
    variant: "wave-line",
    barCount: 64,
    minHeightPx: 2,
    maxHeightPx: 42,
    gapPx: 2,
    radiusPx: 999,
    blurPx: 0,
    opacity: 1
  }
};
