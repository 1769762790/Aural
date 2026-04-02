import type { PlaylistDetail } from "@aural/contracts";
import type { PlayableItem } from "@aural/domain";
import { Badge, Button, EmptyState } from "@aural/ui";
import { PlayableItemTable } from "@renderer/components/PlayableItemTable";
import { formatDateTime, formatDuration } from "@renderer/lib/formatters";

interface CollectionPlaylistDetailProps {
  playlist: PlaylistDetail | null;
  isLoading: boolean;
  error: string | null;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onDeleteSelected: () => void;
  onPlayPlaylist: () => void;
  onPlayTrack: (track: PlayableItem) => void;
  onFavoriteTrack?: (track: PlayableItem) => void | Promise<void>;
}

const fieldStyle = {
  minHeight: 48,
  borderRadius: 18,
  border: "1px solid rgba(171, 205, 255, 0.14)",
  background: "rgba(7, 13, 20, 0.56)",
  color: "var(--aural-text)",
  padding: "0 16px"
};

export const CollectionPlaylistDetail = ({
  playlist,
  isLoading,
  error,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDeleteSelected,
  onPlayPlaylist,
  onPlayTrack,
  onFavoriteTrack
}: CollectionPlaylistDetailProps) => {
  if (isLoading && !playlist) {
    return <div className="aural-panel-frame__empty">Loading selected playlist...</div>;
  }

  if (!playlist) {
    return (
      <EmptyState
        eyebrow="Playlist"
        title="Pick a playlist to inspect its tracks."
        description="Selection stays in sync with the list, so opening, renaming, and deleting all happen in the same flow."
      />
    );
  }

  const totalDuration = playlist.items.reduce((sum: number, track: PlayableItem) => sum + track.duration, 0);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        className="aural-card"
        style={{
          display: "grid",
          gap: 16,
          padding: 18
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge>{playlist.trackCount} tracks</Badge>
              <Badge>{formatDuration(totalDuration)}</Badge>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ fontFamily: "var(--aural-font-display)", fontSize: 26 }}>{playlist.name}</strong>
              <p style={{ margin: 0, color: "var(--aural-text-muted)" }}>
                Created {formatDateTime(playlist.createdAt)} / Updated {formatDateTime(playlist.updatedAt)}
              </p>
            </div>
          </div>

          {!isRenaming ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button type="button" variant="primary" onClick={onPlayPlaylist} disabled={!playlist.items.length}>
                Play
              </Button>
              <Button type="button" variant="soft" onClick={onStartRename}>
                Rename
              </Button>
              <Button type="button" variant="ghost" onClick={onDeleteSelected}>
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        {isRenaming ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSaveRename();
            }}
            style={{ display: "grid", gap: 10 }}
          >
            <label style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  color: "var(--aural-text-muted)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase"
                }}
              >
                Rename playlist
              </span>
              <input
                value={renameValue}
                onChange={(event) => onRenameValueChange(event.target.value)}
                style={fieldStyle}
              />
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={onCancelRename}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p style={{ margin: 0, color: "#ffb9a6", lineHeight: 1.6 }}>
            {error}
          </p>
        ) : null}
      </div>

      {playlist.items.length ? (
        <PlayableItemTable
          items={playlist.items}
          emptyTitle="This playlist is empty."
          emptyDescription="Add tracks from the library or online search, then come back here to play or rearrange them."
          onPlayAll={onPlayPlaylist}
          onShuffle={onPlayPlaylist}
          onPlayItem={onPlayTrack}
          renderItemActions={
            onFavoriteTrack
              ? (item) => (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onFavoriteTrack(item);
                    }}
                  >
                    {item.isFavorite ? "Unsave" : "Save"}
                  </Button>
                )
              : undefined
          }
        />
      ) : (
        <EmptyState
          eyebrow="Playlist"
          title="This playlist is empty."
          description="Add tracks from the library or search flow, then come back here to play or rearrange them."
        />
      )}
    </div>
  );
};
