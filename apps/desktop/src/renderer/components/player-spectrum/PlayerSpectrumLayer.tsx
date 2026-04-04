import { cn } from "@renderer/lib/utils";
import { PlayerSpectrumView } from "./PlayerSpectrumView";
import type { SpectrumStylePreset, SpectrumVariant } from "./types";
import { usePlayerSpectrum } from "./usePlayerSpectrum";

interface PlayerSpectrumLayerProps {
  visible: boolean;
  isPlaying: boolean;
  motionEnabled: boolean;
  variant?: SpectrumVariant;
  presetOverride?: Partial<SpectrumStylePreset>;
  className?: string;
}

export const PlayerSpectrumLayer = ({
  visible,
  isPlaying,
  motionEnabled,
  variant = "bars-classic",
  presetOverride,
  className
}: PlayerSpectrumLayerProps) => {
  const frame = usePlayerSpectrum({
    active: visible,
    motionEnabled
  });

  if (!visible) {
    return null;
  }

  return (
    <div className={cn("pointer-events-none h-[84px] w-full overflow-hidden", className)}>
      <PlayerSpectrumView
        bars={frame.bars}
        intensity={frame.energy}
        isPlaying={isPlaying}
        motionEnabled={motionEnabled}
        variant={variant}
        presetOverride={presetOverride}
      />
    </div>
  );
};
