import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { GlobalSearchResults } from "@renderer/components/global-search/GlobalSearchResults";
import { useGlobalSearch } from "@renderer/components/global-search/useGlobalSearch";

export const GlobalSearchCommand = ({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) => {
  const search = useGlobalSearch();

  return (
    <Popover open={search.open && search.hasQuery} onOpenChange={search.handlePopoverOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn("window-no-drag relative z-10 w-full", compact ? "max-w-[280px]" : "max-w-[460px]", className)}>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={search.inputRef}
            value={search.query}
            onFocus={search.handleFocus}
            onChange={(event) => search.handleQueryChange(event.target.value)}
            onKeyDown={(event) => search.handleKeyDown(event.key)}
            className={cn(
              "w-full rounded-full border border-border bg-background/72 pl-11 text-sm text-foreground outline-none ring-0 transition-colors placeholder:text-[11px] placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-[0.28em] focus:border-primary/45 focus:bg-popover/84",
              compact ? "h-9 pr-10" : "h-10 pr-20"
            )}
            placeholder="Search"
            aria-label="Search"
          />
          {!compact ? (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {search.statusLabel}
            </span>
          ) : null}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={10}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={() => search.closeSearch()}
        className="w-[min(460px,calc(100vw-3rem))] rounded-[28px] border-border bg-popover/96 p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl dark:shadow-[0_32px_90px_rgba(0,0,0,0.42)]"
      >
        <div ref={search.contentRef}>
          <GlobalSearchResults
            loading={search.loading}
            hasResults={search.hasResults}
            normalizedQuery={search.normalizedQuery}
            artists={search.artists}
            albums={search.albums}
            localTracks={search.localTracks}
            onlineTracks={search.onlineTracks}
            onArtistSelect={search.handleArtistSelect}
            onAlbumSelect={search.handleAlbumSelect}
            onLocalTrackSelect={search.handleLocalTrackSelect}
            onOnlineTrackSelect={search.handleOnlineTrackSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
