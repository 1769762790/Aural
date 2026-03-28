import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { UpdateTrackMetadataInput } from "@aural/contracts";
import type { Track } from "@aural/domain";
import { FolderOpen, Shuffle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent } from "@/components/ui/card";
import { SongLibraryTable } from "@renderer/components/SongLibraryTable";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useImportFolders } from "@renderer/hooks/useImportFolders";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

export const LibraryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importFolders = useImportFolders();
  const playTracks = usePlayerStore((state) => state.playTracks);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const clearPlayback = usePlayerStore((state) => state.clearPlayback);
  const removeTrackFromQueue = usePlayerStore((state) => state.removeTrackFromQueue);
  const syncTrackInState = usePlayerStore((state) => state.syncTrackInState);
  const libraryRevision = useLibraryStore((state) => state.revision);
  const markLibraryChanged = useLibraryStore((state) => state.markLibraryChanged);
  const preferences = usePreferencesStore((state) => state.snapshot);

  const query = searchParams.get("q")?.trim() ?? "";
  const hasQuery = query.length > 0;
  const allowMetadataEditing = preferences["library.allowMetadataEditing"] === true;
  const confirmLocalSourceDeletion = preferences["library.confirmLocalSourceDeletion"] !== false;

  const tracks = useAsyncResource(
    () =>
      bridge.library.listTracks({
        limit: 200,
        sortBy: "addedAt",
        sortDirection: "desc",
        ...(hasQuery ? { search: query } : {})
      }),
    [hasQuery, query, libraryRevision],
    `library:tracks:${libraryRevision}:${query || "__all__"}`
  );

  const playTrackCollection = (startTrackId?: Track["id"]) => {
    if (!tracks.data?.length) {
      return;
    }

    void playTracks(tracks.data, startTrackId, "library", hasQuery ? `search:${query}` : "songs");
  };

  const playShuffled = () => {
    if (!tracks.data?.length) {
      return;
    }

    const shuffled = [...tracks.data].sort(() => Math.random() - 0.5);
    void playTracks(shuffled, shuffled[0]?.id, "library", hasQuery ? `search-shuffle:${query}` : "songs-shuffle");
  };

  const handleToggleFavorite = async (track: Track) => {
    await bridge.collection.toggleFavorite(track.id);
    await tracks.refresh();
  };

  const handleUpdateMetadata = async (input: UpdateTrackMetadataInput) => {
    const updated = await bridge.library.updateTrackMetadata(input);
    if (!updated) {
      throw new Error("Track metadata could not be updated.");
    }

    syncTrackInState(updated);
    markLibraryChanged();
    await tracks.refresh();
    toast.success(`Updated metadata for ${updated.title}.`);
  };

  const handleDeleteFromDevice = async (track: Track) => {
    const deletingCurrentTrack = currentTrack?.id === track.id;
    if (deletingCurrentTrack) {
      clearPlayback();
    }

    const deleted = await bridge.library.deleteTrackFromDevice(track.id);
    if (!deleted?.removedFromLibrary) {
      throw new Error("Track could not be removed from device.");
    }

    if (!deletingCurrentTrack) {
      removeTrackFromQueue(track.id);
    }

    markLibraryChanged();
    await tracks.refresh();
    toast.success(`Deleted ${track.title} from device.`);
  };

  return (
    <div className="space-y-6">
      {tracks.data?.length ? (
        <SongLibraryTable
          tracks={tracks.data}
          onPlayAll={() => playTrackCollection(tracks.data?.[0]?.id)}
          onShuffle={playShuffled}
          onPlayTrack={(track) => playTrackCollection(track.id)}
          onToggleFavorite={handleToggleFavorite}
          enableMetadataEditing={allowMetadataEditing}
          enableDeviceDeletion
          confirmDeleteFromDevice={confirmLocalSourceDeletion}
          onUpdateMetadata={handleUpdateMetadata}
          onDeleteFromDevice={handleDeleteFromDevice}
        />
      ) : (
        <Card className="border-border bg-card/78">
          <CardContent className="flex min-h-[280px] flex-col justify-center gap-5 p-8">
            <div className="space-y-3">
              <Badge variant="secondary">{hasQuery ? "No Match" : "Library"}</Badge>
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-foreground">
                {hasQuery ? "No songs matched this search." : "No songs yet."}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                {hasQuery
                  ? "Try a different title, artist, or album keyword from the top search bar."
                  : "Import local folders first so the song view can render the curated list."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasQuery ? (
                <Button onClick={() => void navigate("/songs")}>
                  <X className="size-4" />
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => void importFolders()}>
                  <FolderOpen className="size-4" />
                  Import Folders
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
