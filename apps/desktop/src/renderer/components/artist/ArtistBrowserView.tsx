import { useState, type ReactNode } from "react";
import type { ArtistSummary } from "@aural/domain";
import { Grid2X2, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LibraryBrowser, type BrowserLayout, type LibraryBrowserSortOption } from "@renderer/components/LibraryBrowser";

interface ArtistBrowserViewProps {
  eyebrow: string;
  title: string;
  description: string;
  artists: ArtistSummary[];
  sort?: string;
  sortOptions?: LibraryBrowserSortOption[];
  emptyTitle: string;
  emptyDescription: string;
  onSortChange?: (value: string) => void;
  onArtistSelect: (artist: ArtistSummary) => void;
  controlsSlot?: ReactNode;
  hideSortControl?: boolean;
  preserveInputOrder?: boolean;
}

export const ArtistBrowserView = ({
  eyebrow,
  title,
  description,
  artists,
  sort,
  sortOptions,
  emptyTitle,
  emptyDescription,
  onSortChange,
  onArtistSelect,
  controlsSlot,
  hideSortControl,
  preserveInputOrder
}: ArtistBrowserViewProps) => {
  const [layout, setLayout] = useState<BrowserLayout>("grid");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.06em] text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{artists.length} artists</span>
            <div className="inline-flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant={layout === "grid" ? "default" : "outline"}
                className={cn("size-10", layout === "grid" && "shadow-[0_14px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)]")}
                onClick={() => setLayout("grid")}
                aria-label="Grid layout"
              >
                <Grid2X2 className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={layout === "list" ? "default" : "outline"}
                className={cn("size-10", layout === "list" && "shadow-[0_14px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)]")}
                onClick={() => setLayout("list")}
                aria-label="List layout"
              >
                <Rows3 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <LibraryBrowser
        items={artists.map((artist) => ({
          id: artist.id,
          title: artist.name,
          subtitle: `${artist.trackCount} tracks`,
          meta: `${artist.albumCount} albums`,
          coverPath: artist.coverPath,
          coverUrl: artist.coverUrl,
          fallbackSeed: artist.id
        }))}
        sortLabel="A-Z"
        sortOptions={sortOptions}
        selectedSort={sort}
        onSortChange={onSortChange}
        controlsSlot={controlsSlot}
        hideSortControl={hideSortControl}
        preserveInputOrder={preserveInputOrder}
        layout={layout}
        onLayoutChange={setLayout}
        hideLayoutControls
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onItemClick={(artist) => {
          const selected = artists.find((entry) => entry.id === artist.id);
          if (selected) {
            onArtistSelect(selected);
          }
        }}
      />
    </div>
  );
};
