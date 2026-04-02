import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OnlineAlbumSummary } from "@aural/contracts";
import { OnlineAlbumFilters, type OnlineAlbumArea, type OnlineAlbumFilterOption } from "./online/OnlineAlbumFilters";
import { OnlineAlbumGrid } from "./online/OnlineAlbumGrid";
import { bridge } from "@renderer/lib/bridge";

const PAGE_SIZE = 30;

const AREA_OPTIONS: OnlineAlbumFilterOption[] = [
  { label: "全部", value: "ALL" },
  { label: "华语", value: "ZH" },
  { label: "欧美", value: "EA" },
  { label: "韩国", value: "KR" },
  { label: "日本", value: "JP" }
];

export const OnlineAlbumsPage = () => {
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [area, setArea] = useState<OnlineAlbumArea>("ALL");
  const [albums, setAlbums] = useState<OnlineAlbumSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchAlbumPage = useCallback(
    async (offset: number) => {
      const items = await bridge.online.listAlbums({
        area,
        offset,
        limit: PAGE_SIZE
      });

      return {
        items,
        nextOffset: items.length === PAGE_SIZE ? offset + PAGE_SIZE : null
      };
    },
    [area]
  );

  useEffect(() => {
    let cancelled = false;
    const scrollRoot = document.querySelector<HTMLElement>("[data-shell-scroll-root='true']");
    scrollRoot?.scrollTo({ top: 0, behavior: "auto" });

    const loadFirstPage = async () => {
      setLoading(true);
      setLoadingMore(false);
      try {
        const firstPage = await fetchAlbumPage(0);
        if (cancelled) {
          return;
        }

        setAlbums(firstPage.items);
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
  }, [fetchAlbumPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || nextOffset === null) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = await fetchAlbumPage(nextOffset);
      setAlbums((current) => {
        const merged = [...current];
        nextPage.items.forEach((album) => {
          if (!merged.some((entry) => entry.id === album.id)) {
            merged.push(album);
          }
        });
        return merged;
      });
      setNextOffset(nextPage.nextOffset);
      setHasMore(Boolean(nextPage.nextOffset));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchAlbumPage, hasMore, loadingMore, nextOffset]);

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
      if (distanceToBottom <= 420) {
        void loadMore();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        root: scrollRoot,
        rootMargin: "0px 0px 420px 0px",
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
  }, [albums.length, hasMore, loadMore, loading, loadingMore]);

  return (
    <div className="space-y-8">
      <OnlineAlbumFilters value={area} options={AREA_OPTIONS} onChange={setArea} />

      {loading && !albums.length ? (
        <div className="grid gap-x-7 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={`online-album-skeleton-${index}`} className="space-y-3 animate-pulse">
              <div className="aspect-square rounded-[24px] bg-muted/80" />
              <div className="space-y-2 px-1">
                <div className="h-5 w-3/4 rounded-full bg-muted/80" />
                <div className="h-3 w-2/3 rounded-full bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      ) : albums.length ? (
        <OnlineAlbumGrid albums={albums} onOpenAlbum={(albumId) => void navigate(`/online/albums/${albumId}`)} />
      ) : (
        <div className="rounded-[28px] border border-border bg-card/72 px-8 py-12 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <h2 className="text-3xl font-black tracking-[-0.05em] text-foreground">No albums available.</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            Try another area filter to continue browsing the online album catalog.
          </p>
        </div>
      )}

      {hasMore ? (
        <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Scroll to load more</span>
        </div>
      ) : albums.length ? (
        <div className="flex min-h-16 items-center justify-center">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">All available albums loaded</span>
        </div>
      ) : null}
    </div>
  );
};
