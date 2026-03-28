import type { Track } from "@aural/domain";
import { FavoriteToggleButton } from "@renderer/components/FavoriteToggleButton";
import { formatDateTime, formatDuration } from "@renderer/lib/formatters";

interface TrackTableProps {
  tracks: Track[];
  onPlay?: (track: Track) => void;
  onFavorite?: (track: Track) => void | Promise<void>;
}

export const TrackTable = ({ tracks, onPlay, onFavorite }: TrackTableProps) => (
  <div className="aural-track-table">
    <div className="aural-track-table__header">
      <span>Track</span>
      <span>Artist</span>
      <span>Album</span>
      <span>Length</span>
      <span>Last played</span>
      <span />
    </div>

    <div className="aural-track-table__body">
      {tracks.map((track) => (
        <article key={track.id} className="aural-track-row" onDoubleClick={() => onPlay?.(track)}>
          <span>
            <strong>{track.title}</strong>
            <small>{track.format.toUpperCase()}</small>
          </span>
          <span>{track.artist}</span>
          <span>{track.album}</span>
          <span>{formatDuration(track.duration)}</span>
          <span>{formatDateTime(track.lastPlayedAt)}</span>
          <span>
            <FavoriteToggleButton
              isFavorite={track.isFavorite}
              onClick={(event) => {
                event.stopPropagation();
                void onFavorite?.(track);
              }}
            />
          </span>
        </article>
      ))}
    </div>
  </div>
);
