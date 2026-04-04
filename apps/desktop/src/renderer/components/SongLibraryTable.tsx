import type { UpdateTrackMetadataInput } from "@aural/contracts";
import type { Track } from "@aural/domain";
import { Play, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@renderer/components/ui/data-table";
import { DeleteTrackDialog } from "@renderer/components/song-library/DeleteTrackDialog";
import { EditMetadataDialog } from "@renderer/components/song-library/EditMetadataDialog";
import { useSongLibraryColumns } from "@renderer/components/song-library/song-library-columns";
import { useSongLibraryTableState } from "@renderer/components/song-library/useSongLibraryTableState";

interface SongLibraryTableProps {
  tracks: Track[];
  onPlayAll: () => void;
  onShuffle: () => void;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (track: Track) => void | Promise<void>;
  enableMetadataEditing?: boolean;
  enableDeviceDeletion?: boolean;
  confirmDeleteFromDevice?: boolean;
  onUpdateMetadata?: (input: UpdateTrackMetadataInput) => Promise<void>;
  onDeleteFromDevice?: (track: Track) => Promise<void>;
}

export const SongLibraryTable = ({
  tracks,
  onPlayAll,
  onShuffle,
  onPlayTrack,
  onToggleFavorite,
  enableMetadataEditing = false,
  enableDeviceDeletion = false,
  confirmDeleteFromDevice = true,
  onUpdateMetadata,
  onDeleteFromDevice
}: SongLibraryTableProps) => {
  const state = useSongLibraryTableState({
    tracks,
    onUpdateMetadata,
    onDeleteFromDevice,
    confirmDeleteFromDevice
  });

  const columns = useSongLibraryColumns({
    selectedTrackId: state.selectedTrack?.id ?? null,
    onToggleFavorite,
    openTrackMenuId: state.openTrackMenuId,
    setOpenTrackMenuId: state.setOpenTrackMenuId,
    resetPlaylistMenu: state.resetPlaylistMenu,
    newPlaylistName: state.newPlaylistName,
    setNewPlaylistName: state.setNewPlaylistName,
    setPlaylistError: state.setPlaylistError,
    playlistError: state.playlistError,
    isMutatingPlaylist: state.isMutatingPlaylist,
    playlists: state.playlists.data,
    handleAddToExistingPlaylist: state.handleAddToExistingPlaylist,
    handleCreatePlaylistAndAddTrack: state.handleCreatePlaylistAndAddTrack,
    enableMetadataEditing,
    onUpdateMetadata,
    openMetadataEditor: state.openMetadataEditor,
    enableDeviceDeletion,
    onDeleteFromDevice,
    requestDeleteFromDevice: state.requestDeleteFromDevice
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={tracks}
        tableClassName="w-full table-fixed"
        getRowId={(track) => track.id}
        onRowClick={(row) => state.setSelectedTrackId(row.original.id)}
        onRowDoubleClick={(row) => onPlayTrack(row.original)}
        emptyTitle="No songs yet."
        emptyDescription="Import a folder to start building your local library."
        toolbar={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onPlayAll} className="h-12 px-6 text-xs uppercase tracking-[0.24em]">
                <Play className="size-4 fill-current" />
                Play All
              </Button>
              <Button variant="secondary" onClick={onShuffle} className="h-12 px-6 text-xs uppercase tracking-[0.24em]">
                <Shuffle className="size-4" />
                Shuffle
              </Button>
            </div>
          </div>
        }
        rowClassName={(row) =>
          row.original.id === state.selectedTrack?.id
            ? "bg-accent/50 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.14)] [&>td:first-child]:rounded-l-[22px] [&>td:last-child]:rounded-r-[22px]"
            : "hover:bg-accent/35 [&>td:first-child]:rounded-l-[22px] [&>td:last-child]:rounded-r-[22px]"
        }
      />

      <EditMetadataDialog
        open={Boolean(state.editingTrack)}
        onOpenChange={state.closeMetadataEditor}
        metadataDraft={state.metadataDraft}
        setMetadataDraft={(updater) => state.setMetadataDraft(updater)}
        metadataError={state.metadataError}
        isSavingMetadata={state.isSavingMetadata}
        onSubmit={state.submitMetadataUpdate}
      />

      <DeleteTrackDialog
        trackToDelete={state.trackToDelete}
        isDeletingTrack={state.isDeletingTrack}
        onOpenChange={(open) => {
          if (!open && !state.isDeletingTrack) {
            state.setTrackToDelete(null);
          }
        }}
        onDelete={state.performDeleteFromDevice}
      />
    </>
  );
};
