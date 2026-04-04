import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArtistBrowserView } from "@renderer/components/artist/ArtistBrowserView";
import {
  OnlineArtistFilters,
  type OnlineArtistFilterOption,
  type OnlineArtistFilterValue
} from "@renderer/components/artist/OnlineArtistFilters";
import { bridge } from "@renderer/lib/bridge";

const PAGE_SIZE = 60;

const AREA_OPTIONS: OnlineArtistFilterOption[] = [
  { label: "全部", value: -1 },
  { label: "华语", value: 7 },
  { label: "欧美", value: 96 },
  { label: "日本", value: 8 },
  { label: "韩国", value: 16 },
  { label: "其他", value: 0 }
];

const TYPE_OPTIONS: OnlineArtistFilterOption[] = [
  { label: "全部", value: -1 },
  { label: "男歌手", value: 1 },
  { label: "女歌手", value: 2 },
  { label: "乐队组合", value: 3 }
];

const INITIAL_OPTIONS: OnlineArtistFilterOption[] = [
  { label: "热门", value: -1 },
  ...Array.from({ length: 26 }, (_, index) => ({
    label: String.fromCharCode(65 + index),
    value: String.fromCharCode(97 + index)
  })),
  { label: "#", value: 0 }
];

export const OnlineArtistsPage = () => {
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [area, setArea] = useState<number>(-1);
  const [artistType, setArtistType] = useState<number>(-1);
  const [initial, setInitial] = useState<OnlineArtistFilterValue>(-1);
  const [artists, setArtists] = useState<Awaited<ReturnType<typeof bridge.online.listArtists>>>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const query = useMemo(
    () => ({
      area,
      type: artistType,
      initial
    }),
    [area, artistType, initial]
  );

  const fetchArtistPage = useCallback(
    async (offset: number) => {
      const items = await bridge.online.listArtists({
        ...query,
        offset,
        limit: PAGE_SIZE
      });

      return {
        items,
        nextOffset: items.length === PAGE_SIZE ? offset + PAGE_SIZE : null
      };
    },
    [query]
  );

  useEffect(() => {
    let cancelled = false;

    const scrollRoot = document.querySelector<HTMLElement>("[data-shell-scroll-root='true']");
    scrollRoot?.scrollTo({ top: 0, behavior: "auto" });

    const loadFirstPage = async () => {
      setLoading(true);
      setLoadingMore(false);
      try {
        const firstPage = await fetchArtistPage(0);
        if (cancelled) {
          return;
        }

        setArtists(firstPage.items);
        setNextOffset(firstPage.nextOffset);
        setHasMore(Boolean(firstPage.nextOffset));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadFirstPage();
    return () => {
      cancelled = true;
    };
  }, [fetchArtistPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || nextOffset === null) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = await fetchArtistPage(nextOffset);

      setArtists((current) => {
        const merged = [...current];
        nextPage.items.forEach((artist) => {
          if (!merged.some((entry) => entry.id === artist.id)) {
            merged.push(artist);
          }
        });
        return merged;
      });
      setNextOffset(nextPage.nextOffset);
      setHasMore(Boolean(nextPage.nextOffset));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchArtistPage, hasMore, loadingMore, nextOffset]);

  useEffect(() => {
    const node = loadMoreRef.current;
    const scrollRoot = document.querySelector<HTMLElement>("[data-shell-scroll-root='true']");

    if (!node || !scrollRoot || loading || !hasMore) {
      return;
    }

    const maybeLoadMore = () => {
      if (loading || loadingMore || !hasMore) {
        return;
      }

      const distanceToBottom = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
      if (distanceToBottom <= 360) {
        void loadMore();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        void loadMore();
      },
      {
        root: scrollRoot,
        rootMargin: "0px 0px 360px 0px",
        threshold: 0.1
      }
    );

    observer.observe(node);
    scrollRoot.addEventListener("scroll", maybeLoadMore, { passive: true });
    const frame = window.requestAnimationFrame(maybeLoadMore);

    return () => {
      window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", maybeLoadMore);
      observer.disconnect();
    };
  }, [artists.length, hasMore, loadMore, loading, loadingMore]);

  return (
    <div className="space-y-6">
      <ArtistBrowserView
        eyebrow="Online Mode"
        title="Online artists"
        description="Browse the remote Netease artist catalog with language, category, and initials filters."
        artists={artists}
        controlsSlot={
          <OnlineArtistFilters
            area={area}
            type={artistType}
            initial={initial}
            areaOptions={AREA_OPTIONS}
            typeOptions={TYPE_OPTIONS}
            initialOptions={INITIAL_OPTIONS}
            onAreaChange={setArea}
            onTypeChange={setArtistType}
            onInitialChange={setInitial}
          />
        }
        hideSortControl
        preserveInputOrder
        emptyTitle={loading ? "Loading online artists..." : "No online artists available."}
        emptyDescription={
          loading
            ? "Aural is requesting the remote artist catalog."
            : "Try another language, category, or initials filter to continue browsing."
        }
        onArtistSelect={(artist) => void navigate(`/online/artists/${artist.id}`)}
      />
      {hasMore ? (
        <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scroll to load more</span>
        </div>
      ) : artists.length ? (
        <div className="flex min-h-16 items-center justify-center">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">All available artists loaded</span>
        </div>
      ) : null}
    </div>
  );
};
