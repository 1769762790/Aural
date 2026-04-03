import { PlayableItemTable } from "@renderer/components/PlayableItemTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";
import { OnlinePageShell } from "./online/OnlinePageShell";
import { useOnlineItemActions } from "./online/useOnlineItemActions";
import { useOnlineOverviewStats } from "./online/useOnlineOverviewStats";

export const OnlineFavoritesPage = () => {
  const playItems = usePlayerStore((state) => state.playItems);
  const neteaseCookieValue = usePreferencesStore((state) => state.snapshot["online.neteaseCookie"]);
  const neteaseCookie = typeof neteaseCookieValue === "string" && neteaseCookieValue.trim().length ? neteaseCookieValue.trim() : "";
  const remoteFavorites = useAsyncResource(
    () => (neteaseCookie ? bridge.online.getLikedTracks() : Promise.resolve([])),
    [neteaseCookie],
    `online:favorites:remote:${neteaseCookie || "anonymous"}`
  );
  const favorites = useAsyncResource(() => bridge.collection.getFavorites("online"), [], "online:favorites:items");
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:favorites:playlists");
  const { stats } = useOnlineOverviewStats("favorites");
  const hasRemoteCookie = neteaseCookie.length > 0;
  const favoriteItems = hasRemoteCookie ? remoteFavorites.data ?? [] : favorites.data ?? [];
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    allowFavoriteToggle: !hasRemoteCookie,
    refreshFavorites: hasRemoteCookie ? remoteFavorites.refresh : favorites.refresh,
    refreshPlaylists: playlists.refresh
  });

  return (
    <OnlinePageShell
      title="Online favorites"
      description={
        hasRemoteCookie
          ? "Signed-in liked songs are loaded from your Netease account and stay separated from local-library favorites."
          : "Saved streamed tracks stay in their own lane, so online favorites remain discoverable without mixing into local-library browsing."
      }
      stats={stats}
    >
      <PlayableItemTable
        items={favoriteItems}
        emptyTitle={hasRemoteCookie ? "No liked songs found for this account." : "No online favorites yet."}
        emptyDescription={
          hasRemoteCookie
            ? "Add a valid Netease cookie in Settings > Online, then liked songs from the signed-in account will appear here."
            : "Save tracks from online search and they will collect here."
        }
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
