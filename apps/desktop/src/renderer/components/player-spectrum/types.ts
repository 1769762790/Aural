import type { ReactNode } from "react";

export type SpectrumVariant = "bars-classic" | "bars-soft-glow" | "wave-line";

export interface SpectrumPalette {
  barStart: string;
  barEnd: string;
  glow: string;
  rail: string;
}

export interface SpectrumStylePreset {
  variant: SpectrumVariant;
  barCount: number;
  minHeightPx: number;
  maxHeightPx: number;
  gapPx: number;
  radiusPx: number;
  blurPx: number;
  opacity: number;
}

export interface SpectrumVariantProps {
  bars: number[];
  intensity: number;
  isPlaying: boolean;
  motionEnabled: boolean;
  palette: SpectrumPalette;
  preset: SpectrumStylePreset;
  className?: string;
}

export type SpectrumVariantRenderer = (props: SpectrumVariantProps) => ReactNode;
