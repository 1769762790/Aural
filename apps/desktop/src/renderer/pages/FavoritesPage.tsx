import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PlayableItemTable } from "@renderer/components/PlayableItemTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const FavoritesPage = () => {
  const playItems = usePlayerStore((state) => state.playItems);
  const libraryRevision = useLibraryStore((state) => state.revision);
  const favorites = useAsyncResource(() => bridge.collection.getFavorites(), [libraryRevision], `favorites:tracks:${libraryRevision}`);
  const favoriteItems = favorites.data ?? [];

  const playTrackCollection = (startTrackId?: string) => {
    if (!favoriteItems.length) {
      return;
    }

    void playItems(favoriteItems, startTrackId, "favorites", "favorites");
  };

  const playShuffled = () => {
    if (!favoriteItems.length) {
      return;
    }

    const shuffled = [...favoriteItems].sort(() => Math.random() - 0.5);
    void playItems(shuffled, shuffled[0]?.id, "favorites", "favorites-shuffle");
  };

  return (
    <div className="space-y-6">
      {favoriteItems.length ? (
        <PlayableItemTable
          items={favoriteItems}
          emptyTitle="No favorites yet."
          emptyDescription="Star tracks from Songs, Recent, or online search and they will collect here as your saved listening lane."
          onPlayAll={() => playTrackCollection(favoriteItems[0]?.id)}
          onShuffle={playShuffled}
          onPlayItem={(item) => playTrackCollection(item.id)}
          renderItemActions={(item) => (
            <button
              type="button"
              className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-accent/45 hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                void bridge.collection.toggleFavorite(item.id).then(() => favorites.refresh());
              }}
            >
              {item.isFavorite ? "Unsave" : "Save"}
            </button>
          )}
        />
      ) : (
        <Card className="border-border bg-card/78">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-accent/45 text-primary">
              <Heart className="size-7 fill-current" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-[-0.05em] text-foreground">No favorites yet.</h2>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                Star tracks from Songs, Recent, playlists, or online search and they will collect here as your saved listening lane.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
