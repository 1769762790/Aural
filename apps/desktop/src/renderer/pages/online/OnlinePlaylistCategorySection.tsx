import type { OnlinePlaylistCategory } from "@aural/contracts";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { cn } from "@renderer/lib/utils";
import { OnlinePlaylistCategoryCard } from "./OnlinePlaylistCategoryCard";

interface OnlinePlaylistCategorySectionProps {
  category: OnlinePlaylistCategory;
  onOpenPlaylist: (playlistId: string) => void;
}

const PLACEHOLDER_ITEMS = Array.from({ length: 8 }, (_, index) => index);

export const OnlinePlaylistCategorySection = ({
  category,
  onOpenPlaylist
}: OnlinePlaylistCategorySectionProps) => {
  const playlists = useAsyncResource(
    () => bridge.online.getPlaylistsByCategory(category.name, 8),
    [category.name],
    `online:playlists:category:${category.name}`
  );

  if (!playlists.isLoading && !playlists.data?.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">{category.name}</p>
        {category.group ? <p className="text-sm text-muted-foreground">{category.group}</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {playlists.isLoading
          ? PLACEHOLDER_ITEMS.map((index) => (
              <div
                key={`${category.name}-placeholder-${index}`}
                className={cn(
                  "overflow-hidden rounded-[24px] border border-border/70 bg-card/60 p-0 shadow-[0_18px_44px_rgba(15,23,42,0.08)]",
                  "animate-pulse"
                )}
              >
                <div className="aspect-[1.08] w-full bg-muted/80" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-4/5 rounded-full bg-muted/80" />
                  <div className="h-3 w-2/5 rounded-full bg-muted/70" />
                </div>
              </div>
            ))
          : (playlists.data ?? []).map((playlist) => (
              <OnlinePlaylistCategoryCard
                key={playlist.id}
                playlist={playlist}
                onOpen={onOpenPlaylist}
              />
            ))}
      </div>
    </section>
  );
};
