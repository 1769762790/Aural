import { SpectrumVariantBarsClassic } from "./SpectrumVariantBarsClassic";
import type { SpectrumVariantProps } from "./types";

export const SpectrumVariantWaveLine = (props: SpectrumVariantProps) => {
  return (
    <SpectrumVariantBarsClassic
      {...props}
      preset={{
        ...props.preset,
        minHeightPx: Math.max(1, Math.min(props.preset.minHeightPx, 2)),
        maxHeightPx: Math.max(20, Math.round(props.preset.maxHeightPx * 0.62)),
        gapPx: Math.max(1, props.preset.gapPx - 1)
      }}
    />
  );
};
