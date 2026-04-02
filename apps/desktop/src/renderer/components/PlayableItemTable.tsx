import type { ReactNode } from "react";
import type { PlayableItem } from "@aural/domain";
import { Play, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@renderer/lib/formatters";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { usePlayerStore } from "@renderer/stores/playerStore";

interface PlayableItemTableProps {
  items: PlayableItem[];
  emptyTitle: string;
  emptyDescription: string;
  onPlayAll: () => void;
  onShuffle: () => void;
  onPlayItem: (item: PlayableItem) => void;
  renderItemActions?: (item: PlayableItem) => ReactNode;
}

export const PlayableItemTable = ({
  items,
  emptyTitle,
  emptyDescription,
  onPlayAll,
  onShuffle,
  onPlayItem,
  renderItemActions
}: PlayableItemTableProps) => {
  const currentItem = usePlayerStore((state) => state.currentItem);

  if (!items.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.05em] text-foreground">{emptyTitle}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      <div className="space-y-2">
        {items.map((item, index) => {
          const coverUrl = resolvePlayableCoverUrl(item);
          const isActive = currentItem?.id === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                "grid w-full grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_88px_112px] items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all",
                isActive
                  ? "border-primary/30 bg-accent/55 shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_18px_40px_rgba(0,0,0,0.12)]"
                  : "border-transparent hover:border-border hover:bg-accent/35"
              )}
              onDoubleClick={() => onPlayItem(item)}
            >
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
                  {isActive ? "||" : String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="size-11 shrink-0 rounded-[14px] border border-border bg-cover bg-center"
                  style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
                />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-foreground">{item.title}</p>
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-primary/70">
                    {item.source === "online" ? `${item.provider ?? "online"} / ${item.format}` : item.format.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="truncate text-base text-muted-foreground">{item.artist}</div>
              <div className="truncate text-base italic text-muted-foreground/80">{item.album}</div>
              <div className="text-right text-sm text-muted-foreground">{formatDuration(item.duration)}</div>
              <div className="flex items-center justify-end gap-3">{renderItemActions?.(item) ?? null}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
