import type { CSSProperties } from "react";
import { ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import type { PlayableItem } from "@aural/domain";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { VolumeControl } from "@renderer/components/VolumeControl";

type PlaybackSnapshot = {
  durationSeconds: number;
  isPlaying: boolean;
  playbackMode: "queue" | "shuffle" | "repeat-one";
  progressSeconds: number;
};

export const FloatingPlayerDock = ({
  coverStyle,
  currentItem,
  formatDuration,
  onNext,
  onOpenPlayer,
  onOpenQueue,
  onPrevious,
  onSeek,
  onTogglePlay,
  onTogglePlaybackMode,
  playback,
  queueOpen,
  scrollbarWidth
}: {
  coverStyle?: CSSProperties;
  currentItem: PlayableItem | null;
  formatDuration: (seconds: number) => string;
  onNext: () => void;
  onOpenPlayer: () => void;
  onOpenQueue: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onTogglePlaybackMode: () => void;
  playback: PlaybackSnapshot;
  queueOpen: boolean;
  scrollbarWidth: number;
}) => (
  <footer
    className="pointer-events-auto absolute bottom-3 left-5 z-30 flex items-center justify-between gap-5 rounded-[26px] bg-card/72 px-6 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.12)] backdrop-blur-lg supports-[backdrop-filter]:bg-card/58 dark:border-border/90 dark:bg-card/52 dark:shadow-[0_22px_56px_rgba(0,0,0,0.28)]"
    style={{ right: `calc(1.25rem + ${scrollbarWidth}px)` }}
  >
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        className={cn(
          "window-no-drag size-14 shrink-0 overflow-hidden rounded-[18px] border border-border bg-cover bg-center shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-transform",
          currentItem ? "hover:-translate-y-0.5" : "cursor-not-allowed opacity-60"
        )}
        style={
          coverStyle ?? {
            backgroundImage: "linear-gradient(135deg, rgba(117,73,255,0.95), rgba(55,206,255,0.82))"
          }
        }
        onClick={onOpenPlayer}
        disabled={!currentItem}
        aria-label="Open now playing drawer"
      />
      <div className="w-[200px] lg:w-[200px] 2xl:w-[280px]">
        <p className="truncate text-sm font-semibold text-foreground">{currentItem?.title ?? "No track selected"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {currentItem ? `${currentItem.artist} / ${currentItem.album}` : "Import a folder or switch online mode to start playback."}
        </p>
      </div>
    </div>

    <div className="flex w-full max-w-xl flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={
            playback.playbackMode === "queue"
              ? "Switch to shuffle playback"
              : playback.playbackMode === "shuffle"
                ? "Switch to repeat-one playback"
                : "Switch to queue playback"
          }
          className="size-10 rounded-full text-foreground"
          onClick={onTogglePlaybackMode}
        >
          {playback.playbackMode === "queue" ? (
            <Repeat className="size-4" />
          ) : playback.playbackMode === "shuffle" ? (
            <Shuffle className="size-4" />
          ) : (
            <Repeat1 className="size-4" />
          )}
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Previous track" className="size-10 rounded-full" onClick={onPrevious}>
          <SkipBack className="size-4" />
        </Button>
        <Button type="button" size="icon" aria-label="Toggle playback" className="size-12 rounded-full" onClick={onTogglePlay}>
          {playback.isPlaying ? <Pause className="size-5" /> : <Play className="size-5 fill-current" />}
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Next track" className="size-10 rounded-full" onClick={onNext}>
          <SkipForward className="size-4" />
        </Button>
      </div>

      <div className="flex w-full items-center gap-3 text-[11px] text-muted-foreground">
        <small className="w-10 text-right">{formatDuration(playback.progressSeconds)}</small>
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
          className="flex-1"
        />
        <small className="w-10">{formatDuration(playback.durationSeconds)}</small>
      </div>
    </div>

    <div className="flex min-w-[240px] items-center justify-end gap-4">
      <VolumeControl className="hidden text-xs lg:flex" iconClassName="text-muted-foreground" buttonClassName="hover:text-foreground" />
      <button
        type="button"
        className={cn(
          "hidden items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors md:flex",
          currentItem ? "hover:bg-accent/45 hover:text-foreground" : "cursor-not-allowed opacity-50",
          queueOpen && "bg-accent text-foreground"
        )}
        onClick={onOpenQueue}
        disabled={!currentItem}
        aria-label="Open playing queue"
      >
        <ListMusic className="size-4" />
      </button>
    </div>
  </footer>
);
