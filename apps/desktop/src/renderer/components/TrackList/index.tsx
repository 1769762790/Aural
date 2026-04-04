import { PlayableItem } from "@aural/domain";
import TrackListItem from "./TrackListItem";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { resolvePlayableCoverUrl } from "@/lib/playable";
import { usePlayerStore } from "@/stores/playerStore";

interface TrackListProps {
  tracks: PlayableItem[];
  onRowDoubleClick: (track: PlayableItem) => void;
  onPlay: (track: PlayableItem) => void;
  onDownload: (trackId: string) => void;
}

const TrackList = ({ tracks, onRowDoubleClick, onPlay, onDownload }: TrackListProps) => {
  console.log("Rendering TrackList with tracks:", tracks);
    const currentItem = usePlayerStore((state) => state.currentItem);
  
  return (
    <div>
      {tracks?.map((track) => {
        const coverUrl = resolvePlayableCoverUrl(track)
        return (
          <ContextMenu key={track.id}>
            <ContextMenuTrigger>
              <TrackListItem track={track} isActive={track.id === currentItem?.id} onRowDoubleClick={onRowDoubleClick} />
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48 font-bold">
              <ContextMenuItem className="rounded-[10px]">
                  <div className="flex items-center">
                    <img src={coverUrl} className="w-[50px] h-[50px] rounded-[12px] mr-[10px]" />
                    <div className="w-[100px]">
                      <div className="truncate">{track.title}</div>
                      <div>{track.artist}</div>
                    </div>
                  </div>
                </ContextMenuItem>
              <ContextMenuSeparator/>
              <ContextMenuGroup>
                <ContextMenuItem className="rounded-[10px]" onClick={() => onPlay(track)}>
                  播放
                </ContextMenuItem>
                <ContextMenuItem className="rounded-[10px]">
                  添加到我喜欢的音乐
                </ContextMenuItem>
                <ContextMenuItem className="rounded-[10px]">
                  添加到歌单
                </ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuItem className="rounded-[10px]" onClick={() => onDownload(track.id)}>
                下载
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-red-600 focus:text-red-600 rounded-[10px]">
                删除
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}

export default TrackList;