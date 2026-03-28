import { Heart } from "lucide-react";
import type { Track } from "@aural/domain";
import { Card, CardContent } from "@/components/ui/card";
import { SongLibraryTable } from "@renderer/components/SongLibraryTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const FavoritesPage = () => {
  const playTracks = usePlayerStore((state) => state.playTracks);
  const libraryRevision = useLibraryStore((state) => state.revision);
  const favorites = useAsyncResource(() => bridge.collection.getFavorites(), [libraryRevision], `favorites:tracks:${libraryRevision}`);
  const favoriteTracks = favorites.data ?? [];

  const playTrackCollection = (startTrackId?: Track["id"]) => {
    if (!favoriteTracks.length) {
      return;
    }

    void playTracks(favoriteTracks, startTrackId, "favorites", "favorites");
  };

  const playShuffled = () => {
    if (!favoriteTracks.length) {
      return;
    }

    const shuffled = [...favoriteTracks].sort(() => Math.random() - 0.5);
    void playTracks(shuffled, shuffled[0]?.id, "favorites", "favorites-shuffle");
  };

  return (
    <div className="space-y-6">
      {favoriteTracks.length ? (
        <SongLibraryTable
          tracks={favoriteTracks}
          onPlayAll={() => playTrackCollection(favoriteTracks[0]?.id)}
          onShuffle={playShuffled}
          onPlayTrack={(track) => playTrackCollection(track.id)}
          onToggleFavorite={async (track) => {
            await bridge.collection.toggleFavorite(track.id);
            await favorites.refresh();
          }}
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
                Star tracks from Songs, Recent, or any playlist and they will collect here as your saved listening lane.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
