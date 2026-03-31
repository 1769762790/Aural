import { ListMusic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { VolumeControl } from "@renderer/components/VolumeControl";
import { PlayerSpectrumLayer } from "@renderer/components/player-spectrum/PlayerSpectrumLayer";
import { playerDockLayoutMetrics } from "@renderer/components/player-spectrum/dockLayoutMetrics";
import type { PlayerSceneDockProps } from "./playerScene.types";

export const PlayerSceneDock = ({
  track,
  playback,
  queueOpen,
  motionEnabled,
  coverBackground,
  onSeek,
  onTogglePlay,
  onPlayPrevious,
  onPlayNext,
  onToggleQueue
}: PlayerSceneDockProps) => {
  return (
    <div className={playerDockLayoutMetrics.rootClassName}>
      <div className={cn("pointer-events-none w-full", playerDockLayoutMetrics.baselineClassName)}>
        <div style={{ marginBottom: `${playerDockLayoutMetrics.spectrumToDockGapPx}px` }}>
          <PlayerSpectrumLayer
            visible
            isPlaying={playback.isPlaying}
            motionEnabled={motionEnabled}
            variant="bars-classic"
            presetOverride={{
              barCount: 34,
              minHeightPx: 2,
              maxHeightPx: 80,
              gapPx: 2
            }}
          />
        </div>

        <div className="pointer-events-auto">
          <div
            className="relative overflow-hidden rounded-xl border px-6 pb-2 pt-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            style={{ borderColor: "var(--player-line)" }}
          >
            <div className="absolute left-0 right-0 top-0">
              <Slider
                min={0}
                max={Math.max(playback.durationSeconds, 0)}
                step={0.1}
                value={[Math.min(playback.progressSeconds, Math.max(playback.durationSeconds, 0))]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (typeof next === "number" && Number.isFinite(next)) {
                    onSeek(next);
                  }
                }}
                aria-label="Seek playback position"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-[220px_minmax(0,1fr)_180px] items-center gap-5">
              <div className="flex w-[220px] min-w-[220px] items-center gap-3 overflow-hidden">
                <div
                  className="size-11 rounded-[12px] border border-[color:var(--player-line)] bg-cover bg-center"
                  style={coverBackground}
                />
                <div className="min-w-0 max-w-[160px]">
                  <p className="truncate text-sm font-semibold text-[var(--player-foreground)]">
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-[var(--player-soft)]">{track.artist}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 rounded-full text-[var(--player-muted)] hover:text-[var(--player-foreground)]"
                  onClick={onPlayPrevious}
                >
                  <SkipBack className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="size-12 rounded-full bg-primary text-primary-foreground shadow-[0_12px_26px_rgba(0,0,0,0.18)] hover:bg-primary/90"
                  onClick={onTogglePlay}
                >
                  {playback.isPlaying ? (
                    <Pause className="size-5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 size-5 fill-current" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 rounded-full text-[var(--player-muted)] hover:text-[var(--player-foreground)]"
                  onClick={onPlayNext}
                >
                  <SkipForward className="size-4" />
                </Button>
              </div>

              <div className="ml-auto flex w-[180px] min-w-[180px] items-center justify-end gap-3">
                <VolumeControl
                  className="w-full justify-end"
                  trackClassName="w-20"
                  iconClassName="text-[var(--player-muted)]"
                  buttonClassName="hover:text-[var(--player-foreground)]"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "size-8 rounded-full text-[var(--player-muted)] transition-colors hover:text-[var(--player-foreground)]",
                    queueOpen && "bg-[var(--player-faint)] text-[var(--player-foreground)]"
                  )}
                  onClick={onToggleQueue}
                >
                  <ListMusic className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
