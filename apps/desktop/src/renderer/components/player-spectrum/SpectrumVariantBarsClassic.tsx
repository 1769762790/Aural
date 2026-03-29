import { cn } from "@renderer/lib/utils";
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import type { SpectrumStylePreset, SpectrumVariantProps } from "./types";

const resolveOpacity = (isPlaying: boolean, motionEnabled: boolean, value: number) => {
  if (!motionEnabled) {
    return Math.min(0.35, value * 0.7);
  }
  if (!isPlaying) {
    return Math.min(0.42, value * 0.85);
  }
  return value;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothStep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const createDisplayBars = (source: number[], targetCount: number) => {
  if (!source.length || targetCount <= 0) {
    return [];
  }
  if (targetCount === 1) {
    return [source[0] ?? 0];
  }

  const maxSourceIndex = source.length - 1;
  return Array.from({ length: targetCount }, (_, index) => {
    const ratio = index / (targetCount - 1);
    const mapped = ratio * maxSourceIndex;
    const left = Math.floor(mapped);
    const right = Math.min(maxSourceIndex, left + 1);
    const t = mapped - left;
    return lerp(source[left] ?? 0, source[right] ?? 0, t);
  });
};

export const SpectrumVariantBarsClassic = ({
  bars,
  intensity,
  isPlaying,
  motionEnabled,
  palette,
  preset,
  className
}: SpectrumVariantProps) => {
  const BAR_WIDTH_PX = 2;
  const EDGE_FADE_RATIO = 0.14;
  const DISPLAY_LERP_PLAYING = 0.42;
  const DISPLAY_LERP_IDLE = 0.24;
  const effectiveBars = bars.length ? bars : Array.from({ length: preset.barCount }, () => 0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayBarsRef = useRef<number[]>([]);
  const frameRef = useRef<{
    bars: number[];
    intensity: number;
    isPlaying: boolean;
    motionEnabled: boolean;
    preset: SpectrumStylePreset;
  }>({
    bars: effectiveBars,
    intensity,
    isPlaying,
    motionEnabled,
    preset
  });
  const drawRef = useRef<() => void>(() => undefined);

  const cssVarStyle = useMemo(
    () =>
      ({
        "--spectrum-bar-start": palette.barStart,
        "--spectrum-bar-end": palette.barEnd,
        "--spectrum-glow": palette.glow
      }) as CSSProperties,
    [palette.barEnd, palette.barStart, palette.glow]
  );

  frameRef.current = {
    bars: effectiveBars,
    intensity,
    isPlaying,
    motionEnabled,
    preset
  };

  drawRef.current = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const current = frameRef.current;
    const computed = window.getComputedStyle(container);
    const barStart = computed.getPropertyValue("--spectrum-bar-start").trim() || "#8b5cf6";
    const barEnd = computed.getPropertyValue("--spectrum-bar-end").trim() || "#c4b5fd";
    const glowColor = computed.getPropertyValue("--spectrum-glow").trim() || "rgba(139,92,246,0.45)";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, barStart);
    gradient.addColorStop(1, barEnd);

    const opacity = resolveOpacity(current.isPlaying, current.motionEnabled, current.preset.opacity);
    const baseGap = Math.max(0, current.preset.gapPx);
    const estimatedCount = Math.max(1, Math.floor((width + baseGap) / (BAR_WIDTH_PX + baseGap)));
    const targetBars = createDisplayBars(current.bars, estimatedCount);
    const interpolation = current.isPlaying ? DISPLAY_LERP_PLAYING : DISPLAY_LERP_IDLE;
    if (displayBarsRef.current.length !== estimatedCount) {
      displayBarsRef.current = [...targetBars];
    } else {
      displayBarsRef.current = displayBarsRef.current.map((previous, index) =>
        lerp(previous, targetBars[index] ?? 0, interpolation)
      );
    }
    const displayBars = displayBarsRef.current;
    const gap =
      estimatedCount > 1
        ? Math.max(0, (width - estimatedCount * BAR_WIDTH_PX) / (estimatedCount - 1))
        : 0;

    ctx.globalAlpha = opacity;
    ctx.fillStyle = gradient;
    ctx.shadowColor = current.intensity > 0.1 ? glowColor : "transparent";
    ctx.shadowBlur = current.intensity > 0.1 ? Math.round(6 + current.intensity * 14) : 0;
    const fadeSpan = Math.max(1, width * EDGE_FADE_RATIO);

    displayBars.forEach((value, index) => {
      const amplitude = current.motionEnabled ? value : value * 0.36;
      const barHeight = current.preset.minHeightPx + amplitude * (current.preset.maxHeightPx - current.preset.minHeightPx);
      const clampedHeight = Math.max(current.preset.minHeightPx, Math.min(height, barHeight));
      const x = index * (BAR_WIDTH_PX + gap);
      const y = height - clampedHeight;
      const centerX = x + BAR_WIDTH_PX / 2;
      const leftFade = smoothStep(0, fadeSpan, centerX);
      const rightFade = smoothStep(0, fadeSpan, width - centerX);
      const edgeAlpha = Math.min(leftFade, rightFade);
      ctx.globalAlpha = opacity * edgeAlpha;
      ctx.fillRect(x, y, BAR_WIDTH_PX, clampedHeight);
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  useLayoutEffect(() => {
    drawRef.current();
  }, [effectiveBars, intensity, isPlaying, motionEnabled, preset.gapPx, preset.maxHeightPx, preset.minHeightPx, preset.opacity, preset.radiusPx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      drawRef.current();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("h-full w-full overflow-hidden flex justify-center items-center", className)} style={cssVarStyle}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{
          filter: preset.blurPx > 0 ? `blur(${preset.blurPx}px)` : "none"
        }}
      />
    </div>
  );
};
