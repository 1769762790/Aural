import { useMemo } from "react";
import type { UpdateTrackMetadataInput } from "@aural/contracts";
import type { Track } from "@aural/domain";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@renderer/components/DataTableColumnHeader";
import { FavoriteToggleButton } from "@renderer/components/FavoriteToggleButton";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { formatDuration } from "@renderer/lib/formatters";
import { TrackActionsMenu } from "./TrackActionsMenu";

interface UseSongLibraryColumnsArgs {
  selectedTrackId: string | null;
  onToggleFavorite: (track: Track) => void | Promise<void>;
  openTrackMenuId: string | null;
  setOpenTrackMenuId: (value: string | null) => void;
  resetPlaylistMenu: () => void;
  newPlaylistName: string;
  setNewPlaylistName: (value: string) => void;
  setPlaylistError: (value: string | null) => void;
  playlistError: string | null;
  isMutatingPlaylist: boolean;
  playlists: Array<{ id: string; name: string; trackCount: number }> | null;
  handleAddToExistingPlaylist: (track: Track, playlistId: string) => Promise<void>;
  handleCreatePlaylistAndAddTrack: (track: Track) => Promise<void>;
  enableMetadataEditing?: boolean;
  onUpdateMetadata?: (input: UpdateTrackMetadataInput) => Promise<void>;
  openMetadataEditor: (track: Track) => void;
  enableDeviceDeletion?: boolean;
  onDeleteFromDevice?: (track: Track) => Promise<void>;
  requestDeleteFromDevice: (track: Track) => Promise<void>;
}

export const useSongLibraryColumns = ({
  selectedTrackId,
  onToggleFavorite,
  openTrackMenuId,
  setOpenTrackMenuId,
  resetPlaylistMenu,
  newPlaylistName,
  setNewPlaylistName,
  setPlaylistError,
  playlistError,
  isMutatingPlaylist,
  playlists,
  handleAddToExistingPlaylist,
  handleCreatePlaylistAndAddTrack,
  enableMetadataEditing = false,
  onUpdateMetadata,
  openMetadataEditor,
  enableDeviceDeletion = false,
  onDeleteFromDevice,
  requestDeleteFromDevice
}: UseSongLibraryColumnsArgs) =>
  useMemo<ColumnDef<Track>[]>(
    () => [
      {
        id: "index",
        meta: {
          headerClassName: "w-[72px] min-w-[72px] px-4 lg:px-5",
          cellClassName: "w-[72px] min-w-[72px] px-4 lg:px-5"
        },
        header: () => <span>#</span>,
        cell: ({ row, table }) => {
          const isSelected = row.original.id === selectedTrackId;
          const sortedIndex = table.getRowModel().rows.findIndex((entry) => entry.id === row.id);
          return (
            <span className={isSelected ? "text-sm font-semibold text-primary" : "text-sm text-muted-foreground"}>
              {String(sortedIndex + 1).padStart(2, "0")}
            </span>
          );
        }
      },
      {
        accessorKey: "title",
        meta: {
          headerClassName: "px-4 lg:px-6",
          cellClassName: "px-4 lg:px-6"
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => {
          const track = row.original;
          const artStyle = track.coverPath ? { backgroundImage: `url("${toFileUrl(track.coverPath)}")` } : undefined;

          return (
            <div className="flex min-w-0 items-center gap-4">
              <span
                className="size-10 shrink-0 rounded-xl border border-border bg-cover bg-center"
                style={
                  artStyle ?? {
                    backgroundImage: "linear-gradient(135deg, rgba(120,89,255,0.9), rgba(52,211,153,0.65), rgba(250,204,21,0.4))"
                  }
                }
              />
              <span className="min-w-0 space-y-1">
                <strong className="block truncate text-sm font-semibold text-foreground">{track.title}</strong>
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: "artist",
        meta: {
          headerClassName: "px-4 lg:px-6",
          cellClassName: "px-4 lg:px-6"
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Artist" />,
        cell: ({ row }) => <span className="block truncate text-sm text-muted-foreground">{row.original.artist}</span>
      },
      {
        accessorKey: "album",
        meta: {
          headerClassName: "px-4 lg:px-6",
          cellClassName: "px-4 lg:px-6"
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Album" />,
        cell: ({ row }) => <span className="block truncate text-sm text-muted-foreground">{row.original.album}</span>
      },
      {
        accessorKey: "format",
        meta: {
          headerClassName: "px-4 lg:px-5",
          cellClassName: "px-4 lg:px-5"
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Format" />,
        cell: ({ row }) => (
          <span className="block truncate text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {row.original.format}
          </span>
        )
      },
      {
        accessorKey: "duration",
        meta: {
          headerClassName: "px-4 lg:px-5",
          cellClassName: "px-4 lg:px-5"
        },
        header: ({ column }) => (
          <div className="flex justify-end">
            <DataTableColumnHeader column={column} title="Time" className="justify-end" />
          </div>
        ),
        cell: ({ row }) => <div className="text-right text-sm text-muted-foreground">{formatDuration(row.original.duration)}</div>
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        meta: {
          headerClassName: "w-[104px] min-w-[104px] px-4 text-right",
          cellClassName: "w-[104px] min-w-[104px] px-4"
        },
        cell: ({ row }) => {
          const track = row.original;

          return (
            <div className="flex items-center justify-end gap-2">
              <FavoriteToggleButton
                isFavorite={track.isFavorite}
                onClick={(event) => {
                  event.stopPropagation();
                  void onToggleFavorite(track);
                }}
              />
              <TrackActionsMenu
                track={track}
                open={openTrackMenuId === track.id}
                onOpenChange={(open) => setOpenTrackMenuId(open ? track.id : null)}
                newPlaylistName={newPlaylistName}
                onNewPlaylistNameChange={(value) => {
                  setNewPlaylistName(value);
                  if (playlistError) {
                    setPlaylistError(null);
                  }
                }}
                playlistError={playlistError}
                isMutatingPlaylist={isMutatingPlaylist}
                playlists={playlists}
                onResetPlaylistMenu={resetPlaylistMenu}
                onAddToExistingPlaylist={handleAddToExistingPlaylist}
                onCreatePlaylistAndAddTrack={handleCreatePlaylistAndAddTrack}
                enableMetadataEditing={enableMetadataEditing}
                onUpdateMetadata={onUpdateMetadata}
                onOpenMetadataEditor={openMetadataEditor}
                enableDeviceDeletion={enableDeviceDeletion}
                onDeleteFromDevice={onDeleteFromDevice}
                onRequestDeleteFromDevice={requestDeleteFromDevice}
              />
            </div>
          );
        }
      }
    ],
    [
      enableDeviceDeletion,
      enableMetadataEditing,
      handleAddToExistingPlaylist,
      handleCreatePlaylistAndAddTrack,
      isMutatingPlaylist,
      newPlaylistName,
      onDeleteFromDevice,
      onToggleFavorite,
      onUpdateMetadata,
      openMetadataEditor,
      openTrackMenuId,
      playlistError,
      playlists,
      requestDeleteFromDevice,
      resetPlaylistMenu,
      selectedTrackId,
      setNewPlaylistName,
      setOpenTrackMenuId,
      setPlaylistError
    ]
  );
