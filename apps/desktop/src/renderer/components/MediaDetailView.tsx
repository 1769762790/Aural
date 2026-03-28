import type { ReactNode } from "react";
import { ArrowLeft, Play, Shuffle } from "lucide-react";
import type { Track } from "@aural/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration, formatRuntimeCompact } from "@renderer/lib/formatters";
import { buildPlaylistHeroArtwork } from "@renderer/lib/playlistArtwork";
import { usePlayerStore } from "@renderer/stores/playerStore";

interface MediaDetailViewProps {
  backLabel?: string;
  onBack: () => void;
  eyebrow: string;
  title: string;
  description: string;
  stats: string[];
  tracks: Track[];
  heroSeed: string;
  heroCoverPath: string | null;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPlayAll: () => void;
  onShuffle: () => void;
  onTrackPlay: (track: Track) => void;
  headerActions?: ReactNode;
  renderTrackActions?: (track: Track) => ReactNode;
}

export const MediaDetailView = ({
  backLabel = "Back",
  onBack,
  eyebrow,
  title,
  description,
  stats,
  tracks,
  heroSeed,
  heroCoverPath,
  primaryActionLabel = "Play",
  secondaryActionLabel = "Shuffle",
  onPlayAll,
  onShuffle,
  onTrackPlay,
  headerActions,
  renderTrackActions
}: MediaDetailViewProps) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  return (
    <div className="space-y-10">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-full border border-border bg-background/70 px-4 text-muted-foreground hover:bg-accent/45 hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
      </div>

      <section className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-center">
        <div
          className="aspect-square w-full max-w-[320px] rounded-[30px] border border-border bg-cover bg-center bg-no-repeat shadow-[0_30px_80px_rgba(0,0,0,0.2)]"
          style={buildPlaylistHeroArtwork(heroSeed, heroCoverPath)}
        />

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">{eyebrow}</p>
            <h1 className="max-w-[20ch] text-6xl font-black leading-[0.92] tracking-[-0.08em] text-foreground truncate w-full">{title}</h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {stats.map((entry, index) => (
              <span key={`${entry}-${index}`} className="contents">
                {index > 0 ? <span>&bull;</span> : null}
                <span className={index === 0 ? "font-semibold text-foreground" : undefined}>{entry}</span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              className="h-14 rounded-full px-8 text-xs uppercase tracking-[0.28em]"
              disabled={!tracks.length}
              onClick={onPlayAll}
            >
              <Play className="size-4 fill-current" />
              {primaryActionLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-14 rounded-full px-8 text-xs uppercase tracking-[0.28em]"
              disabled={!tracks.length}
              onClick={onShuffle}
            >
              <Shuffle className="size-4" />
              {secondaryActionLabel}
            </Button>
            {headerActions}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.5fr)_88px_84px] items-center gap-4 border-b border-border px-4 pb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          <span>#</span>
          <span>Title</span>
          <span>Artist</span>
          <span>Album</span>
          <span className="text-right">Time</span>
          <span />
        </div>

        <div className="space-y-2">
          {tracks.map((track, index) => {
            const isActive = currentTrack?.id === track.id;

            return (
              <button
                key={track.id}
                type="button"
                className={cn(
                  "grid w-full grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.5fr)_88px_84px] items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all",
                  isActive
                    ? "border-primary/30 bg-accent/55 shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_18px_40px_rgba(0,0,0,0.12)]"
                    : "border-transparent hover:border-border hover:bg-accent/35"
                )}
                onDoubleClick={() => onTrackPlay(track)}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
                    {isActive ? "||" : String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="size-11 shrink-0 rounded-[14px] border border-border bg-cover bg-center"
                    style={buildPlaylistHeroArtwork(track.id, track.coverPath)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{track.title}</p>
                    <p className="truncate text-xs uppercase tracking-[0.18em] text-primary/70">{track.format.toUpperCase()}</p>
                  </div>
                </div>

                <div className="truncate text-base text-muted-foreground">{track.artist}</div>
                <div className="truncate text-base italic text-muted-foreground/80">{track.album}</div>
                <div className="text-right text-sm text-muted-foreground">{formatDuration(track.duration)}</div>
                <div className="flex items-center justify-end gap-3">{renderTrackActions?.(track) ?? null}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
