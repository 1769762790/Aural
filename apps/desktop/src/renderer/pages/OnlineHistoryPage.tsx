import { PlayableItemTable } from "@renderer/components/PlayableItemTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { OnlinePageShell } from "./online/OnlinePageShell";
import { useOnlineItemActions } from "./online/useOnlineItemActions";
import { useOnlineOverviewStats } from "./online/useOnlineOverviewStats";

export const OnlineHistoryPage = () => {
  const playItems = usePlayerStore((state) => state.playItems);
  const history = useAsyncResource(() => bridge.collection.getRecentHistory(120, "online"), [], "online:history:items");
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:history:playlists");
  const { stats } = useOnlineOverviewStats("history");
  const historyItems = history.data ?? [];
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    refreshHistory: history.refresh,
    refreshPlaylists: playlists.refresh
  });

  return (
    <OnlinePageShell
      title="Online history"
      description="Recent streamed items get their own page, so online playback traces stay visible without competing with local-history review."
      stats={stats}
    >
      <PlayableItemTable
        items={historyItems}
        emptyTitle="No online history yet."
        emptyDescription="Play something from online search and your recent stream history will appear here."
        onPlayAll={() => {
          if (!historyItems.length) {
            return;
          }
          void playItems(historyItems, historyItems[0]?.id, "history", "online-history");
        }}
        onShuffle={() => {
          if (!historyItems.length) {
            return;
          }
          const shuffled = [...historyItems].sort(() => Math.random() - 0.5);
          void playItems(shuffled, shuffled[0]?.id, "history", "online-history:shuffle");
        }}
        onPlayItem={(item) => void playItems(historyItems, item.id, "history", "online-history")}
        renderItemActions={renderItemActions}
      />
    </OnlinePageShell>
  );
};
