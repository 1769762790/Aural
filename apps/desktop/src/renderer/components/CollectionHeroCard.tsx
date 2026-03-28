import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPlaylistHeroArtwork } from "@renderer/lib/playlistArtwork";

interface CollectionHeroCardProps {
  seed: string;
  coverPath: string | null;
  title: string;
  subtitle: string;
  onPlay: () => void;
  onOpen: () => void;
}

export const CollectionHeroCard = ({
  seed,
  coverPath,
  title,
  subtitle,
  onPlay,
  onOpen
}: CollectionHeroCardProps) => {
  return (
    <Card className="group relative h-full overflow-hidden rounded-[28px] border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div
        className="relative flex h-full min-h-[230px] bg-cover bg-center"
        style={buildPlaylistHeroArtwork(seed, coverPath)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(130,103,255,0.16),transparent_26%),linear-gradient(180deg,rgba(7,9,18,0.04),rgba(7,9,18,0.14)_48%,rgba(7,9,18,0.26)_100%)] opacity-85 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto h-1.5 w-16 bg-white/18 opacity-0 blur-[0.5px] transition-all duration-500 group-hover:w-20 group-hover:opacity-100" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div className="relative overflow-hidden border-t border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_18%,rgba(9,11,18,0.34)_100%)] shadow-[0_-20px_56px_rgba(6,8,18,0.22)] backdrop-blur-[5px] saturate-[1.25] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] translate-y-[68%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="relative flex items-end justify-between gap-6 px-6 py-5 md:px-7 md:py-6">
              <div className="min-w-0 space-y-2">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-white/72">
                  Curated Gallery
                </span>
                <div className="space-y-1.5">
                  <h2 className="max-w-[14ch] truncate text-3xl font-black tracking-[-0.06em] text-white md:text-4xl">
                    {title}
                  </h2>
                  <p className="max-w-[42ch] truncate text-sm text-white/76">{subtitle}</p>
                </div>
              </div>

              <div className="pointer-events-auto flex shrink-0 items-center gap-3">
                <Button
                  type="button"
                  size="icon"
                  className="size-12 rounded-full border border-white/18 bg-white/92 text-slate-950 shadow-[0_12px_28px_rgba(0,0,0,0.2)] backdrop-blur-md hover:bg-white"
                  onClick={onPlay}
                >
                  <Play className="ml-0.5 size-4 fill-current" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
