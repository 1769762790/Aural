import { cn } from "@renderer/lib/utils";
import { spectrumPalette, spectrumStylePresets } from "./presets";
import { SpectrumVariantBarsClassic } from "./SpectrumVariantBarsClassic";
import { SpectrumVariantBarsSoftGlow } from "./SpectrumVariantBarsSoftGlow";
import { SpectrumVariantWaveLine } from "./SpectrumVariantWaveLine";
import type { SpectrumStylePreset, SpectrumVariant, SpectrumVariantProps, SpectrumVariantRenderer } from "./types";

const variantRegistry: Record<SpectrumVariant, SpectrumVariantRenderer> = {
  "bars-classic": SpectrumVariantBarsClassic,
  "bars-soft-glow": SpectrumVariantBarsSoftGlow,
  "wave-line": SpectrumVariantWaveLine
};

interface PlayerSpectrumViewProps {
  bars: number[];
  intensity: number;
  isPlaying: boolean;
  motionEnabled: boolean;
  variant?: SpectrumVariant;
  presetOverride?: Partial<SpectrumStylePreset>;
  className?: string;
}

export const PlayerSpectrumView = ({
  bars,
  intensity,
  isPlaying,
  motionEnabled,
  variant = "bars-classic",
  presetOverride,
  className
}: PlayerSpectrumViewProps) => {
  const basePreset = spectrumStylePresets[variant] ?? spectrumStylePresets["bars-classic"];
  const preset: SpectrumStylePreset = {
    ...basePreset,
    ...presetOverride
  };

  const Renderer = variantRegistry[variant] ?? SpectrumVariantBarsClassic;
  const rendererProps: SpectrumVariantProps = {
    bars: bars.slice(0, preset.barCount),
    intensity,
    isPlaying,
    motionEnabled,
    palette: spectrumPalette,
    preset,
    className: cn("h-full w-full", className)
  };

  return <Renderer {...rendererProps} />;
};
