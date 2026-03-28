import { Clock3 } from "lucide-react";
import type { Track } from "@aural/domain";
import { Card, CardContent } from "@/components/ui/card";
import { SongLibraryTable } from "@renderer/components/SongLibraryTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const RecentPage = () => {
  const playTracks = usePlayerStore((state) => state.playTracks);
  const libraryRevision = useLibraryStore((state) => state.revision);
  const history = useAsyncResource(() => bridge.collection.getRecentHistory(120), [libraryRevision], `recent:history:${libraryRevision}`);
  const historyTracks = history.data ?? [];

  const playTrackCollection = (startTrackId?: Track["id"]) => {
    if (!historyTracks.length) {
      return;
    }

    void playTracks(historyTracks, startTrackId, "history", "history");
  };

  const playShuffled = () => {
    if (!historyTracks.length) {
      return;
    }

    const shuffled = [...historyTracks].sort(() => Math.random() - 0.5);
    void playTracks(shuffled, shuffled[0]?.id, "history", "history-shuffle");
  };

  return (
    <div className="space-y-6">
      {historyTracks.length ? (
        <SongLibraryTable
          tracks={historyTracks}
          onPlayAll={() => playTrackCollection(historyTracks[0]?.id)}
          onShuffle={playShuffled}
          onPlayTrack={(track) => playTrackCollection(track.id)}
          onToggleFavorite={async (track) => {
            await bridge.collection.toggleFavorite(track.id);
            await history.refresh();
          }}
        />
      ) : (
        <Card className="border-border bg-card/78">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-accent/45 text-primary">
              <Clock3 className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-[-0.05em] text-foreground">No recent plays yet.</h2>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                Start playback from Songs, Favorites, Artists, or Albums and your recent history will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
