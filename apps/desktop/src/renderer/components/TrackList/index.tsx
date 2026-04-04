import { PlayableItem } from "@aural/domain";
import TrackListItem from "./TrackListItem";

interface TrackListProps {
  tracks: PlayableItem[];
  onRowDoubleClick: (track: PlayableItem) => void;
}

const TrackList = ({ tracks, onRowDoubleClick }: TrackListProps) => {
  console.log("Rendering TrackList with tracks:", tracks);
  return (
    <div>
      {tracks?.map((track) => (
        <TrackListItem key={track.id} track={track} onRowDoubleClick={onRowDoubleClick} />
      ))}
    </div>
  );
}

export default TrackList;