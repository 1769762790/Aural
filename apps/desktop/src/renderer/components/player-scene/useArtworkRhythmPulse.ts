import { useEffect } from "react";
import type { RefObject } from "react";
import { getPlayerSpectrumFrame, subscribePlayerSpectrum } from "@/stores/playerStore";

interface UseArtworkRhythmPulseOptions {
  targetRef: RefObject<HTMLElement | null>;
  active: boolean;
  resolvedTheme: "light" | "dark";
}

const resetPulseVars = (element: HTMLElement | null) => {
  if (!element) {
    return;
  }

  element.style.setProperty("--artwork-pulse-opacity", "0");
  element.style.setProperty("--artwork-pulse-scale", "1");
  element.style.setProperty("--artwork-pulse-blur", "18px");
};

const applyPulseFrame = (element: HTMLElement | null, pulse: number, resolvedTheme: "light" | "dark") => {
  if (!element) {
    return;
  }

  const clampedPulse = Math.max(0, Math.min(1, pulse));
  const opacity = resolvedTheme === "dark" ? 0.08 + clampedPulse * 0.36 : 0.04 + clampedPulse * 0.18;
  const scale = resolvedTheme === "dark" ? 1 + clampedPulse * 0.06 : 1 + clampedPulse * 0.035;
  const blur = resolvedTheme === "dark" ? 18 + clampedPulse * 26 : 12 + clampedPulse * 18;

  element.style.setProperty("--artwork-pulse-opacity", opacity.toFixed(3));
  element.style.setProperty("--artwork-pulse-scale", scale.toFixed(4));
  element.style.setProperty("--artwork-pulse-blur", `${blur.toFixed(2)}px`);
};

export const useArtworkRhythmPulse = ({ targetRef, active, resolvedTheme }: UseArtworkRhythmPulseOptions) => {
  useEffect(() => {
    const target = targetRef.current;

    if (!active) {
      resetPulseVars(target);
      return;
    }

    applyPulseFrame(target, getPlayerSpectrumFrame().pulse ?? 0, resolvedTheme);

    const unsubscribe = subscribePlayerSpectrum((frame) => {
      applyPulseFrame(targetRef.current, frame.pulse ?? 0, resolvedTheme);
    });

    return () => {
      unsubscribe();
      resetPulseVars(targetRef.current);
    };
  }, [active, resolvedTheme, targetRef]);
};
