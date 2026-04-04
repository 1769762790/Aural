import { type ReactNode, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownWideNarrow, Check, Grid2X2, Rows3 } from "lucide-react";
import { DataTable } from "@renderer/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buildPlaylistCardArtwork } from "@renderer/lib/playlistArtwork";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";

export type BrowserLayout = "grid" | "list";

export interface LibraryBrowserItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  coverPath?: string | null;
  coverUrl?: string | null;
  fallbackSeed: string;
}

export interface LibraryBrowserSortOption {
  value: string;
  label: string;
}

interface LibraryBrowserProps {
  items: LibraryBrowserItem[];
  emptyTitle: string;
  emptyDescription: string;
  sortLabel?: string;
  sortOptions?: LibraryBrowserSortOption[];
  selectedSort?: string;
  onSortChange?: (value: string) => void;
  onItemClick?: (item: LibraryBrowserItem) => void;
  controlsSlot?: ReactNode;
  hideSortControl?: boolean;
  preserveInputOrder?: boolean;
  layout?: BrowserLayout;
  onLayoutChange?: (layout: BrowserLayout) => void;
  hideLayoutControls?: boolean;
}

export const LibraryBrowser = ({
  items,
  emptyTitle,
  emptyDescription,
  sortLabel = "Alphabetical",
  sortOptions,
  selectedSort,
  onSortChange,
  onItemClick,
  controlsSlot,
  hideSortControl = false,
  preserveInputOrder = false,
  layout: controlledLayout,
  onLayoutChange,
  hideLayoutControls = false
}: LibraryBrowserProps) => {
  const [internalLayout, setInternalLayout] = useState<BrowserLayout>("grid");
  const layout = controlledLayout ?? internalLayout;

  const handleLayoutChange = (nextLayout: BrowserLayout) => {
    onLayoutChange?.(nextLayout);
    if (controlledLayout === undefined) {
      setInternalLayout(nextLayout);
    }
  };

  const sortedItems = useMemo(
    () =>
      preserveInputOrder || sortOptions?.length
        ? items
        : [...items].sort((left, right) => left.title.localeCompare(right.title, "zh-CN")),
    [items, preserveInputOrder, sortOptions]
  );

  const activeSortLabel = useMemo(() => {
    if (!sortOptions?.length || !selectedSort) {
      return sortLabel;
    }

    return sortOptions.find((option) => option.value === selectedSort)?.label ?? sortLabel;
  }, [selectedSort, sortLabel, sortOptions]);

  const listColumns = useMemo<ColumnDef<LibraryBrowserItem>[]>(
    () => [
      {
        accessorKey: "title",
        meta: {
          headerClassName: "w-[46%] px-4 lg:px-6",
          cellClassName: "w-[46%] px-4 lg:px-6"
        },
        header: () => <span>Name</span>,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <div className="flex min-w-0 items-center gap-4">
              {(() => {
                const coverUrl = resolvePlayableCoverUrl({ coverPath: item.coverPath ?? null, coverUrl: item.coverUrl ?? null });
                return (
              <div
                className="size-14 shrink-0 rounded-[18px] border border-border/70 bg-cover bg-center shadow-[0_12px_30px_rgba(0,0,0,0.1)]"
                style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : buildPlaylistCardArtwork(item.fallbackSeed, item.coverPath ?? null)}
              />
                );
              })()}
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">{item.title}</h3>
              </div>
            </div>
          );
        }
      },
      {
        accessorKey: "subtitle",
        meta: {
          headerClassName: "w-[34%] px-4 lg:px-6",
          cellClassName: "w-[34%] px-4 lg:px-6"
        },
        header: () => <span>Subtitle</span>,
        cell: ({ row }) => <p className="truncate text-sm text-muted-foreground">{row.original.subtitle}</p>
      },
      {
        accessorKey: "meta",
        meta: {
          headerClassName: "w-[180px] min-w-[180px] px-4 lg:px-6 text-right",
          cellClassName: "w-[180px] min-w-[180px] px-4 lg:px-6"
        },
        header: () => <span className="block text-right">Meta</span>,
        cell: ({ row }) => (
          <p className="truncate text-right text-xs uppercase tracking-[0.18em] text-muted-foreground">{row.original.meta}</p>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {controlsSlot ? (
          <div className="min-w-0 flex-1">{controlsSlot}</div>
        ) : hideSortControl ? (
          <div />
        ) : sortOptions?.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent/32 hover:text-foreground"
              >
                <ArrowDownWideNarrow className="size-3.5" />
                <span>Sort:</span>
                <span className="text-foreground">{activeSortLabel}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-52">
              {sortOptions.map((option) => (
                <DropdownMenuItem key={option.value} onSelect={() => onSortChange?.(option.value)}>
                  <span className="flex-1">{option.label}</span>
                  {option.value === selectedSort ? <Check className="size-4 text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <ArrowDownWideNarrow className="size-3.5" />
            <span>Sort:</span>
            <span className="text-foreground">{activeSortLabel}</span>
          </div>
        )}

        {hideLayoutControls ? null : (
        <div className="inline-flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant={layout === "grid" ? "default" : "outline"}
            className={cn("size-10", layout === "grid" && "shadow-[0_14px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)]")}
            onClick={() => handleLayoutChange("grid")}
            aria-label="Grid layout"
          >
            <Grid2X2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={layout === "list" ? "default" : "outline"}
            className={cn("size-10", layout === "list" && "shadow-[0_14px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)]")}
            onClick={() => handleLayoutChange("list")}
            aria-label="List layout"
          >
            <Rows3 className="size-4" />
          </Button>
        </div>
        )}
      </div>

      {!sortedItems.length ? (
        <Card className="border-border bg-card/72 p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-[-0.04em] text-foreground">{emptyTitle}</h2>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">{emptyDescription}</p>
          </div>
        </Card>
      ) : layout === "grid" ? (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {sortedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="group space-y-3 text-left"
              onClick={() => onItemClick?.(item)}
            >
              {(() => {
                const coverUrl = resolvePlayableCoverUrl({ coverPath: item.coverPath ?? null, coverUrl: item.coverUrl ?? null });
                return (
              <div
                className="aspect-square rounded-[30px] border border-border/70 bg-cover bg-center shadow-[0_22px_48px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:-translate-y-1"
                style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : buildPlaylistCardArtwork(item.fallbackSeed, item.coverPath ?? null)}
              />
                );
              })()}
              <div className="space-y-1 px-1">
                <h3 className="truncate text-xl font-bold tracking-[-0.04em] text-foreground">{item.title}</h3>
                <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
                <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground/80">{item.meta}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <DataTable
          columns={listColumns}
          data={sortedItems}
          tableClassName="w-full table-fixed"
          getRowId={(item) => item.id}
          onRowClick={onItemClick ? (row) => onItemClick(row.original) : undefined}
          rowClassName="hover:bg-accent/35"
        />
      )}
    </div>
  );
};
