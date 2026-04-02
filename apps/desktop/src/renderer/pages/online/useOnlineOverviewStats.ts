import { useMemo } from "react";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatCount } from "@renderer/lib/formatters";

export const useOnlineOverviewStats = (scope: string) => {
  const favorites = useAsyncResource(() => bridge.collection.getFavorites("online"), [], `online:overview:favorites:${scope}`);
  const history = useAsyncResource(() => bridge.collection.getRecentHistory(120, "online"), [], `online:overview:history:${scope}`);
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], `online:overview:playlists:${scope}`);
  const downloads = useAsyncResource(() => bridge.online.listDownloads(), [], `online:overview:downloads:${scope}`);

  const stats = useMemo(
    () => [
      formatCount(favorites.data?.length ?? 0, "saved"),
      formatCount(history.data?.length ?? 0, "recent"),
      formatCount(playlists.data?.length ?? 0, "playlists"),
      formatCount(downloads.data?.length ?? 0, "downloads")
    ],
    [downloads.data?.length, favorites.data?.length, history.data?.length, playlists.data?.length]
  );

  return {
    stats
  };
};
