import { useRef, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlayerSceneArtworkPanelProps } from "./playerScene.types";
import { useArtworkRhythmPulse } from "./useArtworkRhythmPulse";

export const PlayerSceneArtworkPanel = ({
  track,
  coverBackground,
  qualityBadges,
  isPlaying,
  resolvedTheme,
  motionEnabled,
  artworkBreathingEnabled,
  glowColor
}: PlayerSceneArtworkPanelProps) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const shouldPulse = isPlaying && motionEnabled && artworkBreathingEnabled;
  const artworkGlowColor = glowColor ?? "var(--primary)";

  useArtworkRhythmPulse({
    targetRef: shellRef,
    active: shouldPulse,
    resolvedTheme
  });

  return (
    <section className="flex h-full w-full max-w-[clamp(320px,28vw,460px)] flex-col items-start justify-center md:justify-self-end">
      <div className="flex w-full flex-col space-y-7">
        <div
          ref={shellRef}
          className={cn(
            "player-scene-artwork-shell mb-10 aspect-square max-w-full shrink-0 rounded-[18px] md:w-[250px] lg:w-[300px] xl:w-[500px]",
            resolvedTheme === "dark" && "is-dark-glow"
          )}
          style={{ "--player-artwork-glow": artworkGlowColor } as CSSProperties}
        >
          <div className="player-scene-artwork-pulse" aria-hidden="true" />
          <div
            className="player-scene-artwork-surface h-full w-full rounded-[18px] bg-cover bg-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={coverBackground}
          />
        </div>

        <div className="space-y-4">
          {/* <div className="mb-6 flex flex-wrap items-center gap-2">
            {qualityBadges.map((entry) => (
              <Badge
                key={entry}
                variant="secondary"
                className="rounded-[5px] border-[color:var(--player-line)] bg-[var(--player-faint)] px-2.5 py-1 text-[9px] tracking-[0.22em] text-[var(--player-muted)]"
              >
                {entry}
              </Badge>
            ))}
          </div> */}

          <div className="min-w-0 max-w-full space-y-1.5">
            <h1 className="truncate text-center text-[36px] font-black leading-[0.94] tracking-[0.1em] text-[var(--player-foreground)]">
              {track.title}
            </h1>
            <p className="truncate text-center text-[20px] font-medium tracking-[0.05em] text-[var(--player-muted)]">
              {track.artist}
              <span className="mx-2.5 text-[var(--player-faint)]">&bull;</span>
              <span className="text-[var(--player-soft)]">{track.album}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
