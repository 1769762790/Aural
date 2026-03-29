import { useEffect, useMemo, useState } from "react";
import { getPlayerSpectrumFrame, subscribePlayerSpectrum, type PlayerSpectrumFrame } from "@renderer/stores/playerStore";

interface UsePlayerSpectrumOptions {
  active: boolean;
  motionEnabled: boolean;
}

const withReducedMotion = (frame: PlayerSpectrumFrame): PlayerSpectrumFrame => ({
  ...frame,
  bars: frame.bars.map((value) => value * 0.38),
  energy: frame.energy * 0.38
});

export const usePlayerSpectrum = ({ active, motionEnabled }: UsePlayerSpectrumOptions) => {
  const [frame, setFrame] = useState<PlayerSpectrumFrame>(() => getPlayerSpectrumFrame());

  const stableFrame = useMemo(() => {
    if (motionEnabled) {
      return frame;
    }
    return withReducedMotion(frame);
  }, [frame, motionEnabled]);

  useEffect(() => {
    if (!active) {
      setFrame(getPlayerSpectrumFrame());
      return undefined;
    }

    let lastCommitTime = 0;
    const unsubscribe = subscribePlayerSpectrum((nextFrame) => {
      if (motionEnabled) {
        setFrame(nextFrame);
        return;
      }

      const now = performance.now();
      if (now - lastCommitTime >= 160) {
        lastCommitTime = now;
        setFrame(nextFrame);
      }
    });

    return unsubscribe;
  }, [active, motionEnabled]);

  return stableFrame;
};
