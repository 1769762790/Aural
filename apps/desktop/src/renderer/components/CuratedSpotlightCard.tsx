import type { CSSProperties } from "react";
import type { Track } from "@aural/domain";
import { toFileUrl } from "@renderer/lib/fileUrl";

interface CuratedSpotlightCardProps {
  track: Track;
  onPlay: (track: Track) => void;
}

export const CuratedSpotlightCard = ({ track, onPlay }: CuratedSpotlightCardProps) => {
  const artStyle: CSSProperties | undefined = track.coverPath
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(6, 4, 10, 0.08), rgba(6, 4, 10, 0.48)), url("${toFileUrl(track.coverPath)}")`
      }
    : undefined;

  return (
    <button type="button" className="aural-spotlight-card" onClick={() => onPlay(track)}>
      <div className="aural-spotlight-card__art" style={artStyle} />
      <div className="aural-spotlight-card__copy">
        <strong>{track.title}</strong>
        <p>{track.artist}</p>
      </div>
    </button>
  );
};
