import { useEffect, useMemo, useState } from "react";
import type { Track } from "@aural/domain";
import type { ColumnDef } from "@tanstack/react-table";
import type { UpdateTrackMetadataInput } from "@aural/contracts";
import { Ellipsis, Info, ListMusic, ListPlus, Loader2, PenLine, Play, Plus, Share2, Shuffle, Trash2 } from "lucide-react";
import { DataTable } from "@renderer/components/DataTable";
import { DataTableColumnHeader } from "@renderer/components/DataTableColumnHeader";
import { FavoriteToggleButton } from "@renderer/components/FavoriteToggleButton";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { formatDuration } from "@renderer/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

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

type MetadataDraft = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
};

const createMetadataDraft = (track: Track): MetadataDraft => ({
  title: track.title,
  artist: track.artist,
  album: track.album,
  genre: track.genre ?? "",
  year: track.year ? String(track.year) : ""
});

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

  const resetPlaylistMenu = () => {
    setNewPlaylistName("");
    setPlaylistError(null);
    setIsMutatingPlaylist(false);
  };

  const openMetadataEditor = (track: Track) => {
    setEditingTrack(track);
    setMetadataDraft(createMetadataDraft(track));
    setMetadataError(null);
    setOpenTrackMenuId(null);
  };

  const closeMetadataEditor = (open: boolean) => {
    if (open) {
      return;
    }

    setEditingTrack(null);
    setMetadataDraft(null);
    setMetadataError(null);
    setIsSavingMetadata(false);
  };

  const submitMetadataUpdate = async () => {
    if (!editingTrack || !metadataDraft || !onUpdateMetadata) {
      return;
    }

    const title = metadataDraft.title.trim();
    const artist = metadataDraft.artist.trim();
    const album = metadataDraft.album.trim();
    const genre = metadataDraft.genre.trim();
    const yearText = metadataDraft.year.trim();

    if (!title || !artist || !album) {
      setMetadataError("Title, artist, and album are required.");
      return;
    }

    const parsedYear = yearText ? Number.parseInt(yearText, 10) : null;
    if (yearText && (parsedYear === null || !Number.isFinite(parsedYear) || parsedYear < 0)) {
      setMetadataError("Year must be a valid number.");
      return;
    }
    const normalizedYear = parsedYear === null ? null : parsedYear;

    setIsSavingMetadata(true);
    setMetadataError(null);

    try {
      await onUpdateMetadata({
        trackId: editingTrack.id,
        title,
        artist,
        album,
        genre: genre || null,
        year: normalizedYear
      });
      closeMetadataEditor(false);
    } catch (error) {
      setMetadataError(error instanceof Error ? error.message : "Could not update metadata.");
      setIsSavingMetadata(false);
    }
  };

  const performDeleteFromDevice = async (track: Track) => {
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
  };

  const requestDeleteFromDevice = async (track: Track) => {
    if (!onDeleteFromDevice) {
      return;
    }

    if (confirmDeleteFromDevice) {
      setTrackToDelete(track);
      setOpenTrackMenuId(null);
      return;
    }

    await performDeleteFromDevice(track);
  };

  const handleAddToExistingPlaylist = async (track: Track, playlistId: string) => {
    setIsMutatingPlaylist(true);
    setPlaylistError(null);

    try {
      await bridge.collection.addToPlaylist({
        playlistId,
        trackIds: [track.id]
      });
      setOpenTrackMenuId(null);
      await playlists.refresh();
      resetPlaylistMenu();
    } catch (error) {
      setPlaylistError(error instanceof Error ? error.message : "Could not add track to playlist.");
      setIsMutatingPlaylist(false);
    }
  };

  const handleCreatePlaylistAndAddTrack = async (track: Track) => {
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
        trackIds: [track.id]
      });
      setOpenTrackMenuId(null);
      await playlists.refresh();
      resetPlaylistMenu();
    } catch (error) {
      setPlaylistError(error instanceof Error ? error.message : "Could not create playlist.");
      setIsMutatingPlaylist(false);
    }
  };

  const columns = useMemo<ColumnDef<Track>[]>(
    () => [
      {
        id: "index",
        meta: {
          headerClassName: "w-[72px] min-w-[72px] px-4 lg:px-5",
          cellClassName: "w-[72px] min-w-[72px] px-4 lg:px-5"
        },
        header: () => <span>#</span>,
        cell: ({ row, table }) => {
          const isSelected = row.original.id === selectedTrack?.id;
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
              <DropdownMenu
                open={openTrackMenuId === track.id}
                onOpenChange={(open) => {
                  setOpenTrackMenuId(open ? track.id : null);
                  if (open) {
                    resetPlaylistMenu();
                  }
                }}
              >
                <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Open track actions"
                  >
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger onClick={(event) => event.stopPropagation()}>
                      <ListPlus className="size-4" />
                      Add to Playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72">
                      <form
                        className="space-y-3 p-1"
                        onSubmit={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleCreatePlaylistAndAddTrack(track);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={newPlaylistName}
                            onChange={(event) => {
                              setNewPlaylistName(event.target.value);
                              if (playlistError) {
                                setPlaylistError(null);
                              }
                            }}
                            placeholder="Create new playlist"
                            className="h-10 rounded-xl border-border bg-background/70 px-4"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            className="size-10 shrink-0 rounded-xl"
                            disabled={isMutatingPlaylist}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>

                        {playlistError ? <p className="px-1 text-xs text-rose-300">{playlistError}</p> : null}
                      </form>

                      <DropdownMenuSeparator />

                      <div className="max-h-64 overflow-y-auto">
                        {playlists.data?.length ? (
                          playlists.data.map((playlist) => (
                            <DropdownMenuItem
                              key={playlist.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                void handleAddToExistingPlaylist(track, playlist.id);
                              }}
                            >
                              <ListMusic className="size-4" />
                              <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
                              <span className="text-[11px] text-muted-foreground">{playlist.trackCount}</span>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No playlists yet.</div>
                        )}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    <Share2 className="size-4" />
                    Share Song
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Info className="size-4" />
                    View Metadata
                  </DropdownMenuItem>
                  {enableMetadataEditing && onUpdateMetadata ? (
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        openMetadataEditor(track);
                      }}
                    >
                      <PenLine className="size-4" />
                      Edit Metadata
                    </DropdownMenuItem>
                  ) : null}
                  {enableDeviceDeletion && onDeleteFromDevice ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-400 focus:text-rose-300"
                        onSelect={(event) => {
                          event.preventDefault();
                          void requestDeleteFromDevice(track);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete from Device
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }
      }
    ],
    [
      confirmDeleteFromDevice,
      enableDeviceDeletion,
      enableMetadataEditing,
      isMutatingPlaylist,
      newPlaylistName,
      onDeleteFromDevice,
      onToggleFavorite,
      onUpdateMetadata,
      openTrackMenuId,
      openMetadataEditor,
      playlistError,
      playlists.data,
      requestDeleteFromDevice,
      selectedTrack?.id
    ]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={tracks}
        tableClassName="w-full table-fixed"
        getRowId={(track) => track.id}
        onRowClick={(row) => setSelectedTrackId(row.original.id)}
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
          row.original.id === selectedTrack?.id
            ? "bg-accent/50 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.14)] [&>td:first-child]:rounded-l-[22px] [&>td:last-child]:rounded-r-[22px]"
            : "hover:bg-accent/35 [&>td:first-child]:rounded-l-[22px] [&>td:last-child]:rounded-r-[22px]"
        }
      />

      <Dialog open={Boolean(editingTrack)} onOpenChange={closeMetadataEditor}>
        <DialogContent className="rounded-[28px] border border-border bg-popover/98 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit metadata</DialogTitle>
            <DialogDescription>Write updated title, artist, album, genre, and year back to the local file.</DialogDescription>
          </DialogHeader>

          {metadataDraft ? (
            <div className="grid gap-4">
              <Input
                value={metadataDraft.title}
                onChange={(event) => setMetadataDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                placeholder="Title"
                className="h-11 rounded-2xl"
              />
              <Input
                value={metadataDraft.artist}
                onChange={(event) => setMetadataDraft((current) => (current ? { ...current, artist: event.target.value } : current))}
                placeholder="Artist"
                className="h-11 rounded-2xl"
              />
              <Input
                value={metadataDraft.album}
                onChange={(event) => setMetadataDraft((current) => (current ? { ...current, album: event.target.value } : current))}
                placeholder="Album"
                className="h-11 rounded-2xl"
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Input
                  value={metadataDraft.genre}
                  onChange={(event) => setMetadataDraft((current) => (current ? { ...current, genre: event.target.value } : current))}
                  placeholder="Genre"
                  className="h-11 rounded-2xl"
                />
                <Input
                  value={metadataDraft.year}
                  onChange={(event) => setMetadataDraft((current) => (current ? { ...current, year: event.target.value } : current))}
                  placeholder="Year"
                  className="h-11 rounded-2xl"
                />
              </div>
              {metadataError ? <p className="text-sm text-rose-400">{metadataError}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => closeMetadataEditor(false)} disabled={isSavingMetadata}>
              Cancel
            </Button>
            <Button onClick={() => void submitMetadataUpdate()} disabled={isSavingMetadata}>
              {isSavingMetadata ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(trackToDelete)} onOpenChange={(open) => !open && !isDeletingTrack && setTrackToDelete(null)}>
        <AlertDialogContent className="rounded-[24px] border border-border bg-popover/98">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete local source file?</AlertDialogTitle>
            <AlertDialogDescription>
              {trackToDelete
                ? `This will permanently delete "${trackToDelete.title}" from your device. The file will be removed from the Songs library and cannot be restored by Aural.`
                : "This will permanently delete the selected file from your device."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTrack}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-400 focus-visible:ring-rose-300"
              disabled={isDeletingTrack || !trackToDelete}
              onClick={(event) => {
                event.preventDefault();
                if (trackToDelete) {
                  void performDeleteFromDevice(trackToDelete);
                }
              }}
            >
              {isDeletingTrack ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
