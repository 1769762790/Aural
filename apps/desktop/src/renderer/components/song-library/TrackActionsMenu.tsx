import type { UpdateTrackMetadataInput } from "@aural/contracts";
import type { Track } from "@aural/domain";
import { Ellipsis, Info, ListMusic, ListPlus, PenLine, Plus, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export const TrackActionsMenu = ({
  track,
  open,
  onOpenChange,
  newPlaylistName,
  onNewPlaylistNameChange,
  playlistError,
  isMutatingPlaylist,
  playlists,
  onResetPlaylistMenu,
  onAddToExistingPlaylist,
  onCreatePlaylistAndAddTrack,
  enableMetadataEditing,
  onUpdateMetadata,
  onOpenMetadataEditor,
  enableDeviceDeletion,
  onDeleteFromDevice,
  onRequestDeleteFromDevice
}: {
  track: Track;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPlaylistName: string;
  onNewPlaylistNameChange: (value: string) => void;
  playlistError: string | null;
  isMutatingPlaylist: boolean;
  playlists: Array<{ id: string; name: string; trackCount: number }> | null;
  onResetPlaylistMenu: () => void;
  onAddToExistingPlaylist: (track: Track, playlistId: string) => Promise<void>;
  onCreatePlaylistAndAddTrack: (track: Track) => Promise<void>;
  enableMetadataEditing: boolean;
  onUpdateMetadata?: (input: UpdateTrackMetadataInput) => Promise<void>;
  onOpenMetadataEditor: (track: Track) => void;
  enableDeviceDeletion: boolean;
  onDeleteFromDevice?: (track: Track) => Promise<void>;
  onRequestDeleteFromDevice: (track: Track) => Promise<void>;
}) => (
  <DropdownMenu
    open={open}
    onOpenChange={(nextOpen) => {
      onOpenChange(nextOpen);
      if (nextOpen) {
        onResetPlaylistMenu();
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
              void onCreatePlaylistAndAddTrack(track);
            }}
          >
            <div className="flex items-center gap-2">
              <Input
                value={newPlaylistName}
                onChange={(event) => onNewPlaylistNameChange(event.target.value)}
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
            {playlists?.length ? (
              playlists.map((playlist) => (
                <DropdownMenuItem
                  key={playlist.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    void onAddToExistingPlaylist(track, playlist.id);
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
            onOpenMetadataEditor(track);
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
              void onRequestDeleteFromDevice(track);
            }}
          >
            <Trash2 className="size-4" />
            Delete from Device
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  </DropdownMenu>
);
