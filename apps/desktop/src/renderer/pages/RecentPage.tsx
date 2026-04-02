import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PlayableItemTable } from "@renderer/components/PlayableItemTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const RecentPage = () => {
  const playItems = usePlayerStore((state) => state.playItems);
  const libraryRevision = useLibraryStore((state) => state.revision);
  const history = useAsyncResource(() => bridge.collection.getRecentHistory(120), [libraryRevision], `recent:history:${libraryRevision}`);
  const historyItems = history.data ?? [];

  const playTrackCollection = (startTrackId?: string) => {
    if (!historyItems.length) {
      return;
    }

    void playItems(historyItems, startTrackId, "history", "history");
  };

  const playShuffled = () => {
    if (!historyItems.length) {
      return;
    }

    const shuffled = [...historyItems].sort(() => Math.random() - 0.5);
    void playItems(shuffled, shuffled[0]?.id, "history", "history-shuffle");
  };

  return (
    <div className="space-y-6">
      {historyItems.length ? (
        <PlayableItemTable
          items={historyItems}
          emptyTitle="No recent plays yet."
          emptyDescription="Start playback from Songs, playlists, or online search and your recent history will appear here."
          onPlayAll={() => playTrackCollection(historyItems[0]?.id)}
          onShuffle={playShuffled}
          onPlayItem={(item) => playTrackCollection(item.id)}
          renderItemActions={(item) => (
            <button
              type="button"
              className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-accent/45 hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                void bridge.collection.toggleFavorite(item.id).then(() => history.refresh());
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
              <Clock3 className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-[-0.05em] text-foreground">No recent plays yet.</h2>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                Start playback from Songs, Favorites, Artists, Albums, or online search and your recent history will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
