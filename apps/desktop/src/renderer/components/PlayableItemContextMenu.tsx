import type { ReactNode } from "react";
import type { PlayableItem } from "@aural/domain";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu";

export interface PlayableItemContextMenuActions {
  onPlay?: (item: PlayableItem) => void;
  onEdit?: (item: PlayableItem) => void;
  onAddMyFavorite?: (item: PlayableItem) => void;
  onAddToPlaylist?: (item: PlayableItem) => void;
  onDelete?: (item: PlayableItem) => void;
}

interface PlayableItemContextMenuProps extends PlayableItemContextMenuActions {
  item: PlayableItem;
  children?: ReactNode;
}

export function PlayableItemContextMenu({
  item,
  onPlay,
  onEdit,
  onAddMyFavorite,
  onAddToPlaylist,
  onDelete,
  children
}: PlayableItemContextMenuProps) {
  const hasPrimaryActions = onPlay || onEdit || onAddMyFavorite || onAddToPlaylist;

  return (
    <ContextMenuContent>
      {children}

      {onPlay ? <ContextMenuItem onClick={() => onPlay(item)}>播放</ContextMenuItem> : null}
      {onEdit ? <ContextMenuItem onClick={() => onEdit(item)}>编辑</ContextMenuItem> : null}
      {onAddMyFavorite ? <ContextMenuItem onClick={() => onAddMyFavorite(item)}>添加到我的喜欢</ContextMenuItem> : null}
      {onAddToPlaylist ? <ContextMenuItem onClick={() => onAddToPlaylist(item)}>添加到歌单</ContextMenuItem> : null}

      {onDelete ? (
        <>
          {hasPrimaryActions || children ? <ContextMenuSeparator /> : null}
          <ContextMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(item)}>
            删除
          </ContextMenuItem>
        </>
      ) : null}
    </ContextMenuContent>
  );
}
