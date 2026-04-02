import { useCallback, useEffect, useState } from "react";
import type { PlaylistDetail } from "@aural/contracts";
import type { PlayableItem, PlaylistSummary } from "@aural/domain";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { bridge } from "@renderer/lib/bridge";
import { useAsyncResource } from "./useAsyncResource";

type QueueSourceType =
  | "album"
  | "artist"
  | "folder"
  | "playlist"
  | "search"
  | "library"
  | "favorites"
  | "history";

const resolveErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

export const useCollectionPage = () => {
  const playItems = usePlayerStore((state) => state.playItems);

  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), []);
  const favorites = useAsyncResource(() => bridge.collection.getFavorites(), []);
  const history = useAsyncResource(() => bridge.collection.getRecentHistory(12), []);

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const selectedPlaylist = useAsyncResource<PlaylistDetail | null>(
    () => (selectedPlaylistId ? bridge.collection.getPlaylist(selectedPlaylistId) : Promise.resolve(null)),
    [selectedPlaylistId]
  );

  useEffect(() => {
    if (!selectedPlaylistId && playlists.data?.length) {
      setSelectedPlaylistId(playlists.data[0].id);
    }
  }, [playlists.data, selectedPlaylistId]);

  useEffect(() => {
    if (renamePlaylistId && renamePlaylistId !== selectedPlaylistId) {
      setRenamePlaylistId(null);
      setRenameName("");
    }
  }, [renamePlaylistId, selectedPlaylistId]);

  const withMutation = useCallback(async (task: () => Promise<void>) => {
    setIsMutating(true);
    setError(null);

    try {
      await task();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setIsMutating(false);
    }
  }, []);

  const refreshPlaylistViews = useCallback(async () => {
    await playlists.refresh();
    await selectedPlaylist.refresh();
  }, [playlists, selectedPlaylist]);

  const playTrackList = useCallback(
    async (items: PlayableItem[], startTrackId: string, sourceType: QueueSourceType, sourceId: string) => {
      if (!items.length) {
        return;
      }

      await playItems(items, startTrackId, sourceType, sourceId);
    },
    [playItems]
  );

  const selectPlaylist = useCallback((playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setRenamePlaylistId(null);
    setRenameName("");
  }, []);

  const beginRename = useCallback((playlist: PlaylistSummary) => {
    setSelectedPlaylistId(playlist.id);
    setRenamePlaylistId(playlist.id);
    setRenameName(playlist.name);
  }, []);

  const beginRenameSelected = useCallback(() => {
    if (!selectedPlaylist.data) {
      return;
    }

    setRenamePlaylistId(selectedPlaylist.data.id);
    setRenameName(selectedPlaylist.data.name);
  }, [selectedPlaylist.data]);

  const cancelRename = useCallback(() => {
    setRenamePlaylistId(null);
    setRenameName("");
  }, []);

  const createPlaylist = useCallback(async () => {
    const name = createName.trim();
    if (!name) {
      setError("Enter a playlist name first.");
      return;
    }

    await withMutation(async () => {
      const created = await bridge.collection.createPlaylist({ name });
      setCreateName("");
      setSelectedPlaylistId(created.id);
      setRenamePlaylistId(null);
      setRenameName("");
      await playlists.refresh();
    });
  }, [createName, playlists, withMutation]);

  const saveRename = useCallback(async () => {
    if (!renamePlaylistId) {
      return;
    }

    const name = renameName.trim();
    if (!name) {
      setError("Enter a new playlist name first.");
      return;
    }

    await withMutation(async () => {
      await bridge.collection.renamePlaylist(renamePlaylistId, name);
      setRenamePlaylistId(null);
      setRenameName("");
      await refreshPlaylistViews();
    });
  }, [refreshPlaylistViews, renameName, renamePlaylistId, withMutation]);

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      const confirmed = window.confirm("Delete this playlist?");
      if (!confirmed) {
        return;
      }

      await withMutation(async () => {
        const deleted = await bridge.collection.deletePlaylist(playlistId);
        if (!deleted) {
          throw new Error("Playlist could not be deleted.");
        }

        if (selectedPlaylistId === playlistId) {
          setSelectedPlaylistId(null);
        }
        if (renamePlaylistId === playlistId) {
          setRenamePlaylistId(null);
          setRenameName("");
        }

        await playlists.refresh();
      });
    },
    [playlists, renamePlaylistId, selectedPlaylistId, withMutation]
  );

  const deleteSelectedPlaylist = useCallback(async () => {
    if (!selectedPlaylistId) {
      return;
    }

    await deletePlaylist(selectedPlaylistId);
  }, [deletePlaylist, selectedPlaylistId]);

  const playSelectedPlaylist = useCallback(async () => {
    if (!selectedPlaylist.data?.items.length) {
      return;
    }

    await playTrackList(selectedPlaylist.data.items, selectedPlaylist.data.items[0].id, "playlist", selectedPlaylist.data.id);
  }, [playTrackList, selectedPlaylist.data]);

  const playPlaylistTrack = useCallback(
    async (track: PlayableItem) => {
      if (!selectedPlaylist.data?.items.length) {
        return;
      }

      await playTrackList(selectedPlaylist.data.items, track.id, "playlist", selectedPlaylist.data.id);
    },
    [playTrackList, selectedPlaylist.data]
  );

  const playFavoritesTrack = useCallback(
    async (track: PlayableItem) => {
      if (!favorites.data?.length) {
        return;
      }

      await playTrackList(favorites.data, track.id, "favorites", "favorites");
    },
    [favorites.data, playTrackList]
  );

  const playHistoryTrack = useCallback(
    async (track: PlayableItem) => {
      if (!history.data?.length) {
        return;
      }

      await playTrackList(history.data, track.id, "history", "history");
    },
    [history.data, playTrackList]
  );

  const toggleFavoriteTrack = useCallback(
    async (track: PlayableItem) => {
      await bridge.collection.toggleFavorite(track.id);
      await Promise.all([favorites.refresh(), history.refresh(), selectedPlaylist.refresh()]);
    },
    [favorites, history, selectedPlaylist]
  );

  return {
    playlists,
    selectedPlaylist,
    favorites,
    history,
    selectedPlaylistId,
    createName,
    setCreateName,
    renamePlaylistId,
    renameName,
    setRenameName,
    error,
    isMutating,
    selectPlaylist,
    beginRename,
    beginRenameSelected,
    cancelRename,
    createPlaylist,
    saveRename,
    deletePlaylist,
    deleteSelectedPlaylist,
    playSelectedPlaylist,
    playPlaylistTrack,
    playFavoritesTrack,
    playHistoryTrack,
    toggleFavoriteTrack
  };
};
