import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { OnlinePlaylistCategory } from "@aural/contracts";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatCount } from "@renderer/lib/formatters";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { OnlinePlaylistHeader } from "./online/OnlinePlaylistHeader";
import { OnlinePlaylistCategorySection } from "./online/OnlinePlaylistCategorySection";

const MAX_CATEGORY_SECTIONS = 8;

const pickSectionCategories = (categories: OnlinePlaylistCategory[]) => {
  const seen = new Set<string>();
  const source = categories.some((category) => category.hot)
    ? categories.filter((category) => category.hot)
    : categories;

  return source
    .filter((category) => {
      const normalizedName = category.name.trim();
      if (!normalizedName || seen.has(normalizedName)) {
        return false;
      }
      seen.add(normalizedName);
      return true;
    })
    .slice(0, MAX_CATEGORY_SECTIONS);
};

export const OnlinePlaylistsPage = () => {
  const navigate = useNavigate();
  const playItems = usePlayerStore((state) => state.playItems);

  const highqualityPlaylists = useAsyncResource(
    () => bridge.online.getHighqualityPlaylists(1),
    [],
    "online:playlists:highquality"
  );
  const dailyRecommendedPlaylists = useAsyncResource(
    () => bridge.online.getDailyRecommendedPlaylists(),
    [],
    "online:playlists:daily-recommendations"
  );
  const playlistCategories = useAsyncResource(
    () => bridge.online.getPlaylistCategories(),
    [],
    "online:playlists:categories"
  );

  const featuredCards = useMemo(() => {
    const cards = [];
    const dailyPlaylist = dailyRecommendedPlaylists.data?.[0] ?? null;
    const highqualityPlaylist = highqualityPlaylists.data?.[0] ?? null;

    cards.push({
      id: dailyPlaylist?.id ?? "__placeholder_daily__",
      seed: dailyPlaylist?.id ?? "online-playlists:daily",
      badge: "Daily Playlist",
      title: "私人雷达",
      subtitle: dailyPlaylist
        ? `${dailyPlaylist.title} • ${formatCount(dailyPlaylist.trackCount, "tracks")}`
        : "私人雷达暂时不可用，请稍后再试。",
      coverPath: null,
      coverUrl: dailyPlaylist?.coverUrl ?? null,
      disabled: !dailyPlaylist
    });

    cards.push({
      id: highqualityPlaylist?.id ?? "__placeholder_highquality__",
      seed: highqualityPlaylist?.id ?? "online-playlists:highquality",
      badge: "Highquality Playlist",
      title: "精品歌单",
      subtitle: highqualityPlaylist
        ? `${highqualityPlaylist.title} • ${formatCount(highqualityPlaylist.trackCount, "tracks")}`
        : "精品歌单暂时不可用，请稍后再试。",
      coverPath: null,
      coverUrl: highqualityPlaylist?.coverUrl ?? null,
      disabled: !highqualityPlaylist
    });

    return cards;
  }, [dailyRecommendedPlaylists.data, highqualityPlaylists.data]);

  // console.log('dailyRecommendedPlaylists', dailyRecommendedPlaylists);
  

  const sectionCategories = useMemo(
    () => pickSectionCategories(playlistCategories.data ?? []),
    [playlistCategories.data]
  );

  const openPlaylist = (playlistId: string) => {
    if (playlistId.startsWith("__placeholder_")) {
      return;
    }
    void navigate(`/online/playlists/${playlistId}`);
  };

  const playFeaturedPlaylist = (playlistId: string) => {
    if (playlistId.startsWith("__placeholder_")) {
      return;
    }

    void bridge.online.getPlaylistDetail(playlistId).then((detail) => {
      const items = detail?.items ?? [];
      if (!items.length) {
        return;
      }
      void playItems(items, items[0]?.id, "playlist", `online-playlist:${playlistId}`);
    });
  };

  return (
    <div className="space-y-10">
      <OnlinePlaylistHeader
        featuredCards={featuredCards}
        onOpenCard={openPlaylist}
        onPlayCard={playFeaturedPlaylist}
      />

      <div className="space-y-12">
        {playlistCategories.isLoading && !sectionCategories.length ? (
          <div className="grid gap-12">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={`playlist-category-skeleton-${index}`} className="space-y-5">
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-primary/18" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-muted/80" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                  {Array.from({ length: 6 }, (_, cardIndex) => (
                    <div
                      key={`playlist-category-skeleton-${index}-${cardIndex}`}
                      className="animate-pulse overflow-hidden rounded-[24px] border border-border/70 bg-card/60 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                    >
                      <div className="aspect-[1.08] w-full bg-muted/80" />
                      <div className="space-y-3 p-4">
                        <div className="h-5 w-4/5 rounded-full bg-muted/80" />
                        <div className="h-3 w-2/5 rounded-full bg-muted/70" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {sectionCategories.map((category) => (
          <OnlinePlaylistCategorySection
            key={category.name}
            category={category}
            onOpenPlaylist={openPlaylist}
          />
        ))}
      </div>
    </div>
  );
};
