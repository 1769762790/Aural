import type { PlaylistSummary } from "@aural/domain";
import { Badge, Button } from "@aural/ui";
import { formatDateTime } from "@renderer/lib/formatters";

interface CollectionPlaylistListProps {
  playlists: PlaylistSummary[];
  selectedPlaylistId: string | null;
  isLoading: boolean;
  onSelect: (playlistId: string) => void;
  onBeginRename: (playlist: PlaylistSummary) => void;
  onDelete: (playlistId: string) => void;
}

export const CollectionPlaylistList = ({
  playlists,
  selectedPlaylistId,
  isLoading,
  onSelect,
  onBeginRename,
  onDelete
}: CollectionPlaylistListProps) => {
  if (isLoading) {
    return <div className="aural-panel-frame__empty">Loading playlists...</div>;
  }

  if (!playlists.length) {
    return (
      <div className="aural-panel-frame__empty">
        No playlists yet. Use the composer above to create the first one.
      </div>
    );
  }

  return (
    <div className="aural-chip-grid">
      {playlists.map((playlist) => {
        const isSelected = playlist.id === selectedPlaylistId;

        return (
          <article
            key={playlist.id}
            className="aural-chip-card"
            style={{
              display: "grid",
              gap: 14,
              borderColor: isSelected ? "rgba(138, 199, 255, 0.36)" : undefined,
              boxShadow: isSelected ? "0 0 0 1px rgba(138, 199, 255, 0.16), 0 18px 28px rgba(10, 18, 26, 0.26)" : undefined
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <strong>{playlist.name}</strong>
              <p>{playlist.trackCount} tracks</p>
              <small>Updated {formatDateTime(playlist.updatedAt)}</small>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {isSelected ? <Badge>Selected</Badge> : null}
              <Button type="button" variant="soft" onClick={() => onSelect(playlist.id)}>
                Open
              </Button>
              <Button type="button" variant="ghost" onClick={() => onBeginRename(playlist)}>
                Rename
              </Button>
              <Button type="button" variant="ghost" onClick={() => onDelete(playlist.id)}>
                Delete
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
};
