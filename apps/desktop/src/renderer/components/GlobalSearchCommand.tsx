import { Fragment, startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { AlbumSummary, ArtistSummary, SearchTrackHit } from "@aural/domain";
import { Disc3, LoaderCircle, Search, UserRound } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { bridge } from "@renderer/lib/bridge";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { formatDuration } from "@renderer/lib/formatters";
import { usePlayerStore } from "@renderer/stores/playerStore";

const SEARCH_DEBOUNCE_MS = 140;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedText = (text: string, keyword: string): ReactNode => {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    return text;
  }

  const matcher = new RegExp(`(${escapeRegExp(normalizedKeyword)})`, "ig");
  const segments = text.split(matcher);

  return segments.map((segment, index) => {
    const isMatch = segment.toLowerCase() === normalizedKeyword.toLowerCase();

    return (
      <Fragment key={`${segment}-${index}`}>
        {isMatch ? (
          <mark className="rounded-md bg-primary/18 px-0.5 text-foreground shadow-[inset_0_-0.55em_0_color-mix(in_srgb,var(--primary)_42%,transparent)]">
            {segment}
          </mark>
        ) : (
          segment
        )}
      </Fragment>
    );
  });
};

export const GlobalSearchCommand = () => {
  const navigate = useNavigate();
  const playTracks = usePlayerStore((state) => state.playTracks);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<SearchTrackHit[]>([]);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const suppressReopenRef = useRef(false);

  const normalizedQuery = query.trim();
  const hasQuery = normalizedQuery.length > 0;
  const hasResults = tracks.length > 0 || artists.length > 0 || albums.length > 0;

  const clearResults = () => {
    setTracks([]);
    setArtists([]);
    setAlbums([]);
  };

  const resetAndBlur = () => {
    setQuery("");
    setDebouncedQuery("");
    clearResults();
    setOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      clearResults();
      setLoading(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void Promise.all([
      bridge.search.searchTracks({ term: debouncedQuery, limit: 6 }),
      bridge.search.searchArtists({ term: debouncedQuery, limit: 5 }),
      bridge.search.searchAlbums({ term: debouncedQuery, limit: 5 })
    ]).then(([nextTracks, nextArtists, nextAlbums]) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setTracks(nextTracks);
        setArtists(nextArtists);
        setAlbums(nextAlbums);
        setLoading(false);
        setOpen(!suppressReopenRef.current);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const closeSearch = (suppressReopen = true) => {
    suppressReopenRef.current = suppressReopen;
    setOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (inputRef.current?.contains(target)) {
        return;
      }

      const clickedCommandItem = target instanceof Element && target.closest("[cmdk-item]");
      if (clickedCommandItem) {
        return;
      }

      if (contentRef.current?.contains(target) || open) {
        closeSearch();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const handleTrackSelect = async (track: SearchTrackHit) => {
    const queueTracks = tracks.length ? tracks : [track];
    await playTracks(queueTracks, track.id, "search", `global-search:${normalizedQuery}`);
    suppressReopenRef.current = false;
    resetAndBlur();
  };

  const handleArtistSelect = (artist: ArtistSummary) => {
    suppressReopenRef.current = true;
    resetAndBlur();
    void navigate(`/artists/${artist.id}`);
  };

  const handleAlbumSelect = (album: AlbumSummary) => {
    suppressReopenRef.current = true;
    resetAndBlur();
    void navigate(`/albums/${album.id}`);
  };

  const statusLabel = useMemo(() => {
    if (loading) {
      return "Searching";
    }

    if (!hasQuery) {
      return "";
    }

    if (!hasResults) {
      return "No suggestions";
    }

    return `${artists.length + albums.length + tracks.length} suggestions`;
  }, [albums.length, artists.length, hasQuery, hasResults, loading, tracks.length]);

  return (
    <Popover
      open={open && hasQuery}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeSearch();
        } else if (hasQuery && !suppressReopenRef.current) {
          setOpen(true);
        }
      }}
    >
      <PopoverAnchor asChild>
        <div className="window-no-drag relative z-10 w-full max-w-[460px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onFocus={() => {
              if (hasQuery && !suppressReopenRef.current) {
                setOpen(true);
              }
            }}
            onChange={(event) => {
              suppressReopenRef.current = false;
              const nextValue = event.target.value;
              setQuery(nextValue);
              if (!nextValue.trim()) {
                setOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeSearch();
              }
            }}
            className="h-10 w-full rounded-full border border-border bg-background/72 pl-11 pr-20 text-sm text-foreground outline-none ring-0 transition-colors placeholder:text-[11px] placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-[0.28em] focus:border-primary/45 focus:bg-popover/84"
            placeholder="Search"
            aria-label="Search"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {statusLabel}
          </span>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={10}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={() => closeSearch()}
        className="w-[min(460px,calc(100vw-3rem))] rounded-[28px] border-border bg-popover/96 p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl dark:shadow-[0_32px_90px_rgba(0,0,0,0.42)]"
      >
        <div ref={contentRef}>
          <Command shouldFilter={false} className="rounded-[28px] border-0 bg-transparent shadow-none">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <Search className="size-3.5" />
                <span>Smart Search</span>
              </div>
              {loading ? <LoaderCircle className="size-4 animate-spin text-primary" /> : null}
            </div>

            <CommandList className="max-h-[430px] p-2">
              {!loading && !hasResults ? <CommandEmpty>Try a song title, artist, or album name.</CommandEmpty> : null}

              {artists.length ? (
                <CommandGroup heading="Artists">
                  {artists.map((artist) => (
                    <CommandItem
                      key={artist.id}
                      value={`artist-${artist.id}`}
                      onSelect={() => handleArtistSelect(artist)}
                      className="group"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/72 text-muted-foreground transition-colors group-data-[selected=true]:border-primary/40 group-data-[selected=true]:bg-accent group-data-[selected=true]:text-accent-foreground">
                        <UserRound className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {renderHighlightedText(artist.name, normalizedQuery)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {artist.trackCount} tracks • {artist.albumCount} albums
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {artists.length && (albums.length || tracks.length) ? <CommandSeparator /> : null}

              {albums.length ? (
                <CommandGroup heading="Albums">
                  {albums.map((album) => (
                    <CommandItem
                      key={album.id}
                      value={`album-${album.id}`}
                      onSelect={() => handleAlbumSelect(album)}
                      className="group"
                    >
                      {album.coverPath ? (
                        <span
                          className="size-11 shrink-0 rounded-2xl border border-border bg-cover bg-center shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
                          style={{ backgroundImage: `url("${toFileUrl(album.coverPath)}")` }}
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/72 text-muted-foreground transition-colors group-data-[selected=true]:border-primary/40 group-data-[selected=true]:bg-accent group-data-[selected=true]:text-accent-foreground">
                          <Disc3 className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {renderHighlightedText(album.title, normalizedQuery)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {renderHighlightedText(
                            `${album.artist} • ${album.trackCount} tracks${album.year ? ` • ${album.year}` : ""}`,
                            normalizedQuery
                          )}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {albums.length && tracks.length ? <CommandSeparator /> : null}

              {tracks.length ? (
                <CommandGroup heading="Songs">
                  {tracks.map((track) => {
                    const coverStyle = track.coverPath
                      ? { backgroundImage: `url("${toFileUrl(track.coverPath)}")` }
                      : {
                          backgroundImage:
                            "linear-gradient(135deg, color-mix(in srgb, var(--primary) 92%, white 8%), color-mix(in srgb, var(--primary) 26%, #31d2ff 74%))"
                        };

                    return (
                      <CommandItem
                        key={track.id}
                        value={`track-${track.id}`}
                        onSelect={() => void handleTrackSelect(track)}
                        className="group"
                      >
                        <span
                          className={cn(
                            "size-11 shrink-0 rounded-2xl border border-border bg-cover bg-center shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                            !track.coverPath && "border-primary/18"
                          )}
                          style={coverStyle}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {renderHighlightedText(track.title, normalizedQuery)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {renderHighlightedText(`${track.artist} • ${track.album}`, normalizedQuery)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {track.reason}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{formatDuration(track.duration)}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
};
