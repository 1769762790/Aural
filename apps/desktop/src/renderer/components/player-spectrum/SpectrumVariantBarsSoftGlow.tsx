import { SpectrumVariantBarsClassic } from "./SpectrumVariantBarsClassic";
import type { SpectrumVariantProps } from "./types";

export const SpectrumVariantBarsSoftGlow = (props: SpectrumVariantProps) => {
  return (
    <SpectrumVariantBarsClassic
      {...props}
      preset={{
        ...props.preset,
        blurPx: Math.max(props.preset.blurPx, 1)
      }}
    />
  );
};
