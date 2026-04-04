import { resolvePlayableCoverUrl } from "@/lib/playable";
import { cn } from "@/lib/utils";
import { PlayableItem } from "@aural/domain";
import { formatDuration } from "@renderer/lib/formatters";

interface TrackListItemProps {
  track: PlayableItem;
  isActive: boolean;
  onRowDoubleClick: (track: PlayableItem) => void;
}


const TrackListItem = ({track, isActive, onRowDoubleClick}: TrackListItemProps) => {
  const coverUrl = resolvePlayableCoverUrl(track)

  return (
<div className={cn("w-full grid grid-cols-3 border-box px-[15px] py-[15px] rounded-sm hover:bg-muted/80 cursor-pointer", isActive && "bg-muted")} onDoubleClick={() => onRowDoubleClick(track)}>
  {/* 第一列：歌曲信息 */}
  <div className="flex items-center min-w-0">
    <img
      className="w-[44px] h-[44px] object-cover rounded-[10px] mr-[10px] shrink-0"
      src={coverUrl!}
    />
    <div className="flex-1">
      <div className="font-bold">{track.title}</div>
      <div className="truncate text-sm text-muted-foreground">{track.albumArtist}</div>
    </div>
  </div>

  {/* 第二列：专辑 */}
  <div className="min-w-0 flex items-center">{track.album}</div>

  {/* 第三列：时长 */}
  <div className="flex items-center justify-end">{formatDuration(track.duration)}</div>
</div>
  );
}

export default TrackListItem;