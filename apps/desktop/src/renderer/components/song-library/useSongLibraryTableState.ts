import { useCallback, useEffect, useMemo, useState } from "react";
import type { UpdateTrackMetadataInput } from "@aural/contracts";
import type { Track } from "@aural/domain";
import { toast } from "@/components/ui/sonner";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { createMetadataDraft, normalizeMetadataInput, type MetadataDraft } from "./song-library.utils";

interface UseSongLibraryTableStateArgs {
  tracks: Track[];
  onUpdateMetadata?: (input: UpdateTrackMetadataInput) => Promise<void>;
  onDeleteFromDevice?: (track: Track) => Promise<void>;
  confirmDeleteFromDevice?: boolean;
}

export const useSongLibraryTableState = ({
  tracks,
  onUpdateMetadata,
  onDeleteFromDevice,
  confirmDeleteFromDevice = true
}: UseSongLibraryTableStateArgs) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(tracks[0]?.id ?? null);
  const [openTrackMenuId, setOpenTrackMenuId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [isMutatingPlaylist, setIsMutatingPlaylist] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [metadataDraft, setMetadataDraft] = useState<MetadataDraft | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "collection:playlists");

  useEffect(() => {
    setSelectedTrackId((current) => {
      if (current && tracks.some((track) => track.id === current)) {
        return current;
      }

      return tracks[0]?.id ?? null;
    });
  }, [tracks]);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? tracks[0] ?? null,
    [selectedTrackId, tracks]
  );

  const resetPlaylistMenu = useCallback(() => {
    setNewPlaylistName("");
    setPlaylistError(null);
    setIsMutatingPlaylist(false);
  }, []);

  const openMetadataEditor = useCallback((track: Track) => {
    setEditingTrack(track);
    setMetadataDraft(createMetadataDraft(track));
    setMetadataError(null);
    setOpenTrackMenuId(null);
  }, []);

  const closeMetadataEditor = useCallback((open: boolean) => {
    if (open) {
      return;
    }

    setEditingTrack(null);
    setMetadataDraft(null);
    setMetadataError(null);
    setIsSavingMetadata(false);
  }, []);

  const submitMetadataUpdate = useCallback(async () => {
    if (!editingTrack || !metadataDraft || !onUpdateMetadata) {
      return;
    }

    const normalized = normalizeMetadataInput(editingTrack.id, metadataDraft);
    if (!normalized.value) {
      setMetadataError(normalized.error);
      return;
    }

    setIsSavingMetadata(true);
    setMetadataError(null);

    try {
      await onUpdateMetadata(normalized.value);
      closeMetadataEditor(false);
    } catch (error) {
      setMetadataError(error instanceof Error ? error.message : "Could not update metadata.");
      setIsSavingMetadata(false);
    }
  }, [closeMetadataEditor, editingTrack, metadataDraft, onUpdateMetadata]);

  const performDeleteFromDevice = useCallback(async (track: Track) => {
    if (!onDeleteFromDevice) {
      return;
    }

    setIsDeletingTrack(true);

    try {
      await onDeleteFromDevice(track);
      setTrackToDelete(null);
      setOpenTrackMenuId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete source file.");
    } finally {
      setIsDeletingTrack(false);
    }
  }, [onDeleteFromDevice]);

  const requestDeleteFromDevice = useCallback(async (track: Track) => {
    if (!onDeleteFromDevice) {
      return;
    }

    if (confirmDeleteFromDevice) {
      setTrackToDelete(track);
      setOpenTrackMenuId(null);
      return;
    }

    await performDeleteFromDevice(track);
  }, [confirmDeleteFromDevice, onDeleteFromDevice, performDeleteFromDevice]);

  const handleAddToExistingPlaylist = useCallback(async (track: Track, playlistId: string) => {
    setIsMutatingPlaylist(true);
    setPlaylistError(null);

    try {
      await bridge.collection.addToPlaylist({
        playlistId,
        itemIds: [track.id]
      });
      setOpenTrackMenuId(null);
      await playlists.refresh();
      resetPlaylistMenu();
    } catch (error) {
      setPlaylistError(error instanceof Error ? error.message : "Could not add track to playlist.");
      setIsMutatingPlaylist(false);
    }
  }, [playlists, resetPlaylistMenu]);

  const handleCreatePlaylistAndAddTrack = useCallback(async (track: Track) => {
    const name = newPlaylistName.trim();
    if (!name) {
      setPlaylistError("Enter a playlist name first.");
      return;
    }

    setIsMutatingPlaylist(true);
    setPlaylistError(null);

    try {
      const created = await bridge.collection.createPlaylist({ name });
      await bridge.collection.addToPlaylist({
        playlistId: created.id,
        itemIds: [track.id]
      });
      setOpenTrackMenuId(null);
      await playlists.refresh();
      resetPlaylistMenu();
    } catch (error) {
      setPlaylistError(error instanceof Error ? error.message : "Could not create playlist.");
      setIsMutatingPlaylist(false);
    }
  }, [newPlaylistName, playlists, resetPlaylistMenu]);

  return {
    playlists,
    selectedTrack,
    selectedTrackId,
    openTrackMenuId,
    newPlaylistName,
    playlistError,
    isMutatingPlaylist,
    editingTrack,
    metadataDraft,
    metadataError,
    isSavingMetadata,
    trackToDelete,
    isDeletingTrack,
    setSelectedTrackId,
    setOpenTrackMenuId,
    setNewPlaylistName,
    setPlaylistError,
    setMetadataDraft,
    setTrackToDelete,
    resetPlaylistMenu,
    openMetadataEditor,
    closeMetadataEditor,
    submitMetadataUpdate,
    performDeleteFromDevice,
    requestDeleteFromDevice,
    handleAddToExistingPlaylist,
    handleCreatePlaylistAndAddTrack
  };
};
