import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AlbumSummary, ArtistSummary, PlayableItem, SearchTrackHit } from "@aural/domain";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { useLocalGlobalSearchSource } from "./useLocalGlobalSearchSource";
import { useOnlineGlobalSearchSource } from "./useOnlineGlobalSearchSource";

const SEARCH_DEBOUNCE_MS = 500;

export const useUnifiedGlobalSearch = () => {
  const navigate = useNavigate();
  const playItems = usePlayerStore((state) => state.playItems);
  const playTracks = usePlayerStore((state) => state.playTracks);
  const searchLocal = useLocalGlobalSearchSource();
  const searchOnline = useOnlineGlobalSearchSource();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localTracks, setLocalTracks] = useState<SearchTrackHit[]>([]);
  const [onlineTracks, setOnlineTracks] = useState<PlayableItem[]>([]);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const suppressReopenRef = useRef(false);

  const normalizedQuery = query.trim();
  const hasQuery = normalizedQuery.length > 0;
  const hasResults = localTracks.length > 0 || onlineTracks.length > 0 || artists.length > 0 || albums.length > 0;

  const clearResults = () => {
    setLocalTracks([]);
    setOnlineTracks([]);
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

    void Promise.allSettled([searchLocal(debouncedQuery), searchOnline(debouncedQuery)]).then((results) => {
      if (cancelled) {
        return;
      }

      const localResult = results[0];
      const onlineResult = results[1];

      startTransition(() => {
        setLocalTracks(localResult.status === "fulfilled" ? localResult.value.tracks : []);
        setArtists(localResult.status === "fulfilled" ? localResult.value.artists : []);
        setAlbums(localResult.status === "fulfilled" ? localResult.value.albums : []);
        setOnlineTracks(onlineResult.status === "fulfilled" ? onlineResult.value : []);
        setLoading(false);
        setOpen(!suppressReopenRef.current);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searchLocal, searchOnline]);

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

  const handleLocalTrackSelect = async (track: SearchTrackHit) => {
    const queueTracks = localTracks.length ? localTracks : [track];
    await playTracks(queueTracks, track.id, "search", `global-search:${normalizedQuery}`);
    suppressReopenRef.current = false;
    resetAndBlur();
  };

  const handleOnlineTrackSelect = async (item: PlayableItem) => {
    const queueItems = onlineTracks.length ? onlineTracks : [item];
    await playItems(queueItems, item.id, "online", `global-search-online:${normalizedQuery}`);
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

    return `${artists.length + albums.length + localTracks.length + onlineTracks.length} suggestions`;
  }, [albums.length, artists.length, hasQuery, hasResults, loading, localTracks.length, onlineTracks.length]);

  return {
    query,
    open,
    loading,
    localTracks,
    onlineTracks,
    artists,
    albums,
    normalizedQuery,
    hasQuery,
    hasResults,
    statusLabel,
    inputRef,
    contentRef,
    closeSearch,
    handleLocalTrackSelect,
    handleOnlineTrackSelect,
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
