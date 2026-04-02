import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AlbumSummary, ArtistSummary, SearchTrackHit } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";
import { usePlayerStore } from "@renderer/stores/playerStore";

const SEARCH_DEBOUNCE_MS = 140;

export const useGlobalSearch = () => {
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

  const closeSearch = (suppressReopen = true) => {
    suppressReopenRef.current = suppressReopen;
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

  return {
    query,
    open,
    loading,
    tracks,
    artists,
    albums,
    normalizedQuery,
    hasQuery,
    hasResults,
    statusLabel,
    inputRef,
    contentRef,
    closeSearch,
    handleTrackSelect,
    handleArtistSelect,
    handleAlbumSelect,
    handleFocus: () => {
      if (hasQuery && !suppressReopenRef.current) {
        setOpen(true);
      }
    },
    handleQueryChange: (nextValue: string) => {
      suppressReopenRef.current = false;
      setQuery(nextValue);
      if (!nextValue.trim()) {
        setOpen(false);
      }
    },
    handleKeyDown: (key: string) => {
      if (key === "Escape") {
        closeSearch();
      }
    },
    handlePopoverOpenChange: (nextOpen: boolean) => {
      if (!nextOpen) {
        closeSearch();
        return;
      }

      if (hasQuery && !suppressReopenRef.current) {
        setOpen(true);
      }
    }
  };
};
