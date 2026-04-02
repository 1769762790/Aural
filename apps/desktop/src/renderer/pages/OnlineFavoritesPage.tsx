import { PlayableItemTable } from "@renderer/components/PlayableItemTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { OnlinePageShell } from "./online/OnlinePageShell";
import { useOnlineItemActions } from "./online/useOnlineItemActions";
import { useOnlineOverviewStats } from "./online/useOnlineOverviewStats";

export const OnlineFavoritesPage = () => {
  const playItems = usePlayerStore((state) => state.playItems);
  const favorites = useAsyncResource(() => bridge.collection.getFavorites("online"), [], "online:favorites:items");
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:favorites:playlists");
  const { stats } = useOnlineOverviewStats("favorites");
  const favoriteItems = favorites.data ?? [];
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    refreshFavorites: favorites.refresh,
    refreshPlaylists: playlists.refresh
  });

  return (
    <OnlinePageShell
      title="Online favorites"
      description="Saved streamed tracks stay in their own lane, so online favorites remain discoverable without mixing into local-library browsing."
      stats={stats}
    >
      <PlayableItemTable
        items={favoriteItems}
        emptyTitle="No online favorites yet."
        emptyDescription="Save tracks from online search and they will collect here."
        onPlayAll={() => {
          if (!favoriteItems.length) {
            return;
          }
          void playItems(favoriteItems, favoriteItems[0]?.id, "favorites", "online-favorites");
        }}
        onShuffle={() => {
          if (!favoriteItems.length) {
            return;
          }
          const shuffled = [...favoriteItems].sort(() => Math.random() - 0.5);
          void playItems(shuffled, shuffled[0]?.id, "favorites", "online-favorites:shuffle");
        }}
        onPlayItem={(item) => void playItems(favoriteItems, item.id, "favorites", "online-favorites")}
        renderItemActions={renderItemActions}
      />
    </OnlinePageShell>
  );
};
