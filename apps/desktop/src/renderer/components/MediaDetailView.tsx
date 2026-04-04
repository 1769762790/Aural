import { useMemo, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Play, Shuffle } from "lucide-react";
import type { PlayableItem } from "@aural/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PlayableItemContextMenu,
  type PlayableItemContextMenuActions
} from "@renderer/components/PlayableItemContextMenu";
import { DataTable } from "@renderer/components/ui/data-table";
import { formatDuration } from "@renderer/lib/formatters";
import { buildPlaylistHeroArtwork } from "@renderer/lib/playlistArtwork";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { usePlayerStore } from "@renderer/stores/playerStore";
import TrackList from "./TrackList";

interface MediaDetailViewProps {
  backLabel?: string;
  onBack: () => void;
  eyebrow?: string;
  title: string;
  description: string;
  stats: string[];
  tracks: PlayableItem[];
  heroSeed: string;
  heroCoverPath: string | null;
  heroCoverUrl?: string | null;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPlayAll: () => void;
  onShuffle: () => void;
  onTrackPlay: (track: PlayableItem) => void;
  headerActions?: ReactNode;
  renderTrackActions?: (track: PlayableItem) => ReactNode;
  trackContextMenuActions?: PlayableItemContextMenuActions;
}

export const MediaDetailView = ({
  eyebrow,
  title,
  description,
  stats,
  tracks,
  heroSeed,
  heroCoverPath,
  heroCoverUrl = null,
  primaryActionLabel = "Play",
  secondaryActionLabel = "Shuffle",
  onPlayAll,
  onShuffle,
  onTrackPlay,
  headerActions,
  renderTrackActions,
  trackContextMenuActions
}: MediaDetailViewProps) => {
  console.log("Rendering MediaDetailView with tracks:", tracks);
  const currentItem = usePlayerStore((state) => state.currentItem);

  const columns = useMemo<ColumnDef<PlayableItem>[]>(
    () => [
      {
        id: "index",
        enableSorting: false,
        meta: {
          headerClassName: "w-[72px] min-w-[72px] px-4",
          cellClassName: "w-[72px] min-w-[72px] px-4"
        },
        header: () => <span>#</span>,
        cell: ({ row, table }) => {
          const track = row.original;
          const isActive = currentItem?.id === track.id;
          const sortedIndex = table.getRowModel().rows.findIndex((entry) => entry.id === row.id);

          return (
            <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
              {isActive ? "||" : String(sortedIndex + 1).padStart(2, "0")}
            </span>
          );
        }
      },
      {
        accessorKey: "title",
        enableSorting: false,
        meta: {
          headerClassName: "px-4",
          cellClassName: "px-4"
        },
        header: () => <span>Title</span>,
        cell: ({ row }) => {
          const track = row.original;
          const coverUrl = resolvePlayableCoverUrl(track);

          return (
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="size-11 shrink-0 rounded-[14px] border border-border bg-cover bg-center"
                style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : buildPlaylistHeroArtwork(track.id, track.coverPath)}
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">{track.title}</p>
                <p className="truncate text-xs uppercase tracking-[0.18em] text-primary/70">
                  {track.source === "online" ? `${track.provider ?? "online"} / ${track.format}` : track.format.toUpperCase()}
                </p>
              </div>
            </div>
          );
        }
      },
      {
        accessorKey: "artist",
        enableSorting: false,
        meta: {
          headerClassName: "px-4",
          cellClassName: "px-4"
        },
        header: () => <span>Artist</span>,
        cell: ({ row }) => <div className="truncate text-base text-muted-foreground">{row.original.artist}</div>
      },
      {
        accessorKey: "album",
        enableSorting: false,
        meta: {
          headerClassName: "px-4",
          cellClassName: "px-4"
        },
        header: () => <span>Album</span>,
        cell: ({ row }) => <div className="truncate text-base italic text-muted-foreground/80">{row.original.album}</div>
      },
      {
        accessorKey: "duration",
        enableSorting: false,
        meta: {
          headerClassName: "w-[88px] min-w-[88px] px-4 text-right",
          cellClassName: "w-[88px] min-w-[88px] px-4"
        },
        header: () => <div className="text-right">Time</div>,
        cell: ({ row }) => <div className="text-right text-sm text-muted-foreground">{formatDuration(row.original.duration)}</div>
      },
      {
        id: "actions",
        enableSorting: false,
        meta: {
          headerClassName: "w-[84px] min-w-[84px] px-4",
          cellClassName: "w-[84px] min-w-[84px] px-4"
        },
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <div className="flex items-center justify-end gap-3">{renderTrackActions?.(row.original) ?? null}</div>
      }
    ],
    [currentItem?.id, renderTrackActions]
  );

  return (
    <div className="space-y-10">
      <section className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-center">
        <div
          className="aspect-square w-full max-w-[320px] rounded-[30px] border border-border bg-cover bg-center bg-no-repeat shadow-[0_30px_80px_rgba(0,0,0,0.2)]"
          style={heroCoverUrl ? { backgroundImage: `url("${heroCoverUrl}")` } : buildPlaylistHeroArtwork(heroSeed, heroCoverPath)}
        />

        <div className="space-y-6">
          <div className="space-y-3">
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">{eyebrow}</p> : null}
            <h1 className="w-full max-w-[20ch] truncate text-[45px] font-black leading-[0.92] tracking-[-0.08em] text-foreground">
              {title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {stats.map((entry, index) => (
              <span key={`${entry}-${index}`} className="contents">
                {index > 0 ? <span>&bull;</span> : null}
                <span className={index === 0 ? "font-semibold text-foreground" : undefined}>{entry}</span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              className="h-14 rounded-full px-8 text-xs uppercase tracking-[0.28em]"
              disabled={!tracks.length}
              onClick={onPlayAll}
            >
              <Play className="size-4 fill-current" />
              {primaryActionLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-14 rounded-full px-8 text-xs uppercase tracking-[0.28em]"
              disabled={!tracks.length}
              onClick={onShuffle}
            >
              <Shuffle className="size-4" />
              {secondaryActionLabel}
            </Button>
            {headerActions}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {/* <DataTable
          columns={columns}
          data={tracks}
          getRowId={(track) => track.id}
          onRowDoubleClick={(row) => onTrackPlay(row.original)}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="w-full table-fixed"
          rowClassName={(row) =>
            row.original.id === currentItem?.id
              ? "bg-accent/55 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.14),0_18px_40px_rgba(0,0,0,0.12)] [&>td:first-child]:rounded-l-[24px] [&>td:last-child]:rounded-r-[24px]"
              : "hover:bg-accent/35 [&>td:first-child]:rounded-l-[24px] [&>td:last-child]:rounded-r-[24px]"
          }
          renderRowContextMenu={
            trackContextMenuActions
              ? (row) => <PlayableItemContextMenu item={row.original} {...trackContextMenuActions} />
              : undefined
          }
        /> */}
        <TrackList tracks={tracks} onRowDoubleClick={onTrackPlay} />
      </section>
    </div>
  );
};
