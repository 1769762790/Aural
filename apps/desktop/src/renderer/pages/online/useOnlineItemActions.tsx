import { useState } from "react";
import type { PlayableItem, PlaylistSummary } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";

type RefreshCallback = () => Promise<void>;

interface UseOnlineItemActionsArgs {
  playlists: PlaylistSummary[];
  refreshPlaylists?: RefreshCallback;
  refreshFavorites?: RefreshCallback;
  refreshHistory?: RefreshCallback;
  refreshDownloads?: RefreshCallback;
  onFavoriteToggled?: (itemId: string, isFavorite: boolean) => void;
}

export const useOnlineItemActions = ({
  playlists,
  refreshPlaylists,
  refreshFavorites,
  refreshHistory,
  refreshDownloads,
  onFavoriteToggled
}: UseOnlineItemActionsArgs) => {
  const [playlistActionPendingId, setPlaylistActionPendingId] = useState<string | null>(null);

  const createOrPickPlaylist = async () => {
    if (playlists.length === 1) {
      return playlists[0]!.id;
    }

    const input = window.prompt(playlists.length ? "Enter a playlist name. A new one will be created if needed." : "Enter a new playlist name.");
    const name = input?.trim();
    if (!name) {
      return null;
    }

    const matched = playlists.find((playlist) => playlist.name.trim().toLowerCase() === name.toLowerCase());
    if (matched) {
      return matched.id;
    }

    const created = await bridge.collection.createPlaylist({ name });
    await refreshPlaylists?.();
    return created.id;
  };

  const addItemToPlaylist = async (itemId: string) => {
    setPlaylistActionPendingId(itemId);
    try {
      const playlistId = await createOrPickPlaylist();
      if (!playlistId) {
        return;
      }

      await bridge.collection.addToPlaylist({
        playlistId,
        itemIds: [itemId]
      });
      await refreshPlaylists?.();
    } finally {
      setPlaylistActionPendingId(null);
    }
  };

  const toggleFavorite = async (item: PlayableItem) => {
    const nextFavoriteState = await bridge.collection.toggleFavorite(item.id);
    onFavoriteToggled?.(item.id, nextFavoriteState);
    const refreshTasks: Array<Promise<void>> = [];
    if (refreshFavorites) {
      refreshTasks.push(refreshFavorites());
    }
    if (refreshHistory) {
      refreshTasks.push(refreshHistory());
    }
    await Promise.all(refreshTasks);
  };

  const downloadItem = async (itemId: string) => {
    await bridge.online.download(itemId);
    await refreshDownloads?.();
  };

  const renderItemActions = (item: PlayableItem) => (
    <>
      <button
        type="button"
        className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-accent/45 hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          void toggleFavorite(item);
        }}
      >
        {item.isFavorite ? "Unsave" : "Save"}
      </button>
      <button
        type="button"
        className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-accent/45 hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          void addItemToPlaylist(item.id);
        }}
      >
        {playlistActionPendingId === item.id ? "Adding" : "Playlist"}
      </button>
      <button
        type="button"
        className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-accent/45 hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          void downloadItem(item.id);
        }}
      >
        Download
      </button>
    </>
  );

  return {
    renderItemActions
  };
};
