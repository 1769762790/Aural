import type {
  LyricsResponse,
  OnlineAlbumDetail,
  OnlineAlbumListQuery,
  OnlineAlbumSummary,
  OnlineArtistListQuery,
  OnlineChartsOverview,
  OnlineChartSummary,
  OnlinePlaylistCategory,
  OnlinePlaylistDetail,
  OnlinePlaylistRecommendation
} from "@aural/contracts";
import type { AuralRepository } from "@aural/data";
import type { ArtistSummary } from "@aural/domain";
import { createLyricsSnapshot } from "@aural/player";
import { createEnhancedClient } from "../enhanced-client";
import {
  asRecord,
  extractProviderItemIdFromItemId,
  mapArtistToSummary,
  mapLyricsSnapshot,
  mapSongToPlayableInput,
  normalizeArtistInitial,
  normalizeArtistName
} from "./shared";

interface OnlineMetadataServiceOptions {
  repository: AuralRepository;
}

export const createOnlineMetadataService = ({ repository }: OnlineMetadataServiceOptions) => {
  const artistSummaryCache = new Map<string, ArtistSummary>();
  const enhancedClient = createEnhancedClient();

  const ensureOnlineItem = async (itemId: string) => {
    const existing = repository.findPlayableItemById(itemId);
    if (existing?.source === "online") {
      return existing;
    }

    const providerItemId = extractProviderItemIdFromItemId(itemId);
    if (!providerItemId) {
      return null;
    }

    const detail = await enhancedClient.getSongDetail(providerItemId).catch(() => null);
    if (!detail) {
      return null;
    }

    return repository.upsertPlayableItem(mapSongToPlayableInput(detail));
  };

  const cacheArtistSummaries = (artists: ArtistSummary[]) => {
    artists.forEach((artist) => {
      artistSummaryCache.set(artist.id, artist);
    });
    return artists;
  };

  const resolveArtistSummaryById = async (artistId: string, fallbackName?: string | null): Promise<ArtistSummary> => {
    const cached = artistSummaryCache.get(artistId);
    if (cached) {
      return cached;
    }

    const normalizedFallbackName = fallbackName?.trim() ?? "";
    if (normalizedFallbackName) {
      const matches = await enhancedClient.searchArtists(normalizedFallbackName, 8).catch(() => []);
      const matched =
        matches.find((artist) => String(artist.id) === artistId) ??
        matches.find((artist) => normalizeArtistName(artist.name ?? "") === normalizeArtistName(normalizedFallbackName)) ??
        null;
      if (matched) {
        const summary = mapArtistToSummary(matched);
        artistSummaryCache.set(summary.id, summary);
        return summary;
      }
    }

    const summary: ArtistSummary = {
      id: artistId,
      name: normalizedFallbackName || `Artist ${artistId}`,
      normalizedName: normalizeArtistName(normalizedFallbackName || `Artist ${artistId}`),
      trackCount: 0,
      albumCount: 0,
      coverPath: null,
      coverUrl: null
    };
    artistSummaryCache.set(summary.id, summary);
    return summary;
  };

  return {
    ensureOnlineItem,
    searchTracks: async (term: string, page = 1, limit = 20) => {
      const songs = await enhancedClient.searchSongs(term, page, limit);
      return songs.map((song) => repository.upsertPlayableItem(mapSongToPlayableInput(song)));
    },
    listArtists: async (query: OnlineArtistListQuery = {}) => {
      const area = Number.isFinite(Number(query.area)) ? Number(query.area) : -1;
      const type = Number.isFinite(Number(query.type)) ? Number(query.type) : -1;
      const initial = normalizeArtistInitial(query.initial);
      const offset = Math.max(0, Number(query.offset ?? 0));
      const limit = Math.max(1, Math.min(120, Number(query.limit ?? 60)));
      const artists = await enhancedClient.listArtists(initial, offset, limit, area, type);
      return cacheArtistSummaries(artists.map(mapArtistToSummary));
    },
    getArtistDetail: async (artistId: string) => {
      const songs = await enhancedClient.getArtistTopSongs(artistId).catch(() => []);
      if (!songs.length) {
        const fallbackSummary = await resolveArtistSummaryById(artistId, null);
        return {
          ...fallbackSummary,
          tracks: [],
          totalDurationSeconds: 0
        };
      }

      const items = songs.map((song) => repository.upsertPlayableItem(mapSongToPlayableInput(song)));
      const fallbackName =
        songs[0]?.ar?.find((artist) => String(artist.id ?? "") === artistId)?.name?.trim() ??
        songs[0]?.ar?.[0]?.name?.trim() ??
        null;
      const summary = await resolveArtistSummaryById(artistId, fallbackName);
      return {
        ...summary,
        tracks: items,
        totalDurationSeconds: items.reduce((sum, track) => sum + track.duration, 0)
      };
    },
    listAlbums: async (query: OnlineAlbumListQuery = {}): Promise<OnlineAlbumSummary[]> => {
      const limit = Math.max(1, Math.min(60, Number(query.limit ?? 30)));
      const offset = Math.max(0, Number(query.offset ?? 0));
      const area = typeof query.area === "string" && query.area.trim().length ? query.area : "ALL";
      return enhancedClient.getAlbumsByArea(area as "ALL" | "ZH" | "EA" | "KR" | "JP", offset, limit);
    },
    getAlbumDetail: async (albumId: string): Promise<OnlineAlbumDetail | null> => {
      const detail = await enhancedClient.getAlbumDetail(albumId).catch(() => null);
      if (!detail) {
        return null;
      }

      const items = detail.songs.map((song) => repository.upsertPlayableItem(mapSongToPlayableInput(song)));

      return {
        id: detail.id,
        title: detail.title,
        artist: detail.artist,
        description: detail.description,
        coverUrl: detail.coverUrl,
        publishTime: detail.publishTime,
        year: detail.year,
        company: detail.company,
        items,
        trackCount: Math.max(detail.trackCount, items.length),
        totalDurationSeconds: items.reduce((sum, track) => sum + track.duration, 0)
      };
    },
    getChartsOverview: async (): Promise<OnlineChartsOverview> => {
      const charts = await enhancedClient.getChartsOverview().catch(() => []);
      const coreTargets = [
        { title: "飙升榜", badge: "Rising Now" },
        { title: "新歌榜", badge: "Fresh Drops" },
        { title: "原创榜", badge: "Originality" },
        { title: "热歌榜", badge: "Most Played" }
      ];

      const coreSeeds = coreTargets
        .map((target) => {
          const matched =
            charts.find((chart) => chart.title.includes(target.title)) ??
            charts.find((chart) => chart.title === target.title) ??
            null;

          return matched
            ? {
                ...matched,
                badge: target.badge
              }
            : null;
        })
        .filter((entry): entry is OnlineChartSummary => Boolean(entry));

      const core = await Promise.all(
        coreSeeds.map(async (chart) => {
          const detail = await enhancedClient.getPlaylistDetail(chart.id).catch(() => null);
          const preview = Array.isArray(detail?.tracks)
            ? detail.tracks.slice(0, 5).map((track, index) => ({
                rank: index + 1,
                title: track.name?.trim() || `Track ${index + 1}`,
                artist:
                  track.ar
                    ?.map((artist) => artist.name?.trim() || "")
                    .filter((name): name is string => Boolean(name))
                    .join(", ") || "Unknown Artist"
              }))
            : chart.preview.slice(0, 5);

          return {
            ...chart,
            preview
          };
        })
      );

      const coreIds = new Set(core.map((chart) => chart.id));
      const genre = charts
        .filter((chart) => !coreIds.has(chart.id))
        .map((chart) => ({
          ...chart,
          badge: chart.title,
          preview: chart.preview.slice(0, 3)
        }));

      return {
        core,
        genre,
        total: charts.length
      };
    },
    getDailyRecommendedPlaylists: async (): Promise<OnlinePlaylistRecommendation[]> => {
      const playlists = await enhancedClient.getDailyRecommendedPlaylists().catch(() => []);
      return playlists.map((playlist) => ({
        id: String(playlist.id),
        title: playlist.name?.trim() || "Daily Mix",
        subtitle:
          playlist.copywriter?.trim() ||
          `${Math.max(0, Number(playlist.trackCount ?? 0))} curated tracks ready for streaming.`,
        coverUrl: playlist.picUrl?.trim() || playlist.coverImgUrl?.trim() || null,
        trackCount: Math.max(0, Number(playlist.trackCount ?? 0))
      }));
    },
    getHighqualityPlaylists: async (limit = 6): Promise<OnlinePlaylistRecommendation[]> => {
      const playlists = await enhancedClient.getHighqualityPlaylists(limit).catch(() => []);
      return playlists.map((playlist) => ({
        id: String(playlist.id),
        title: playlist.name?.trim() || "Featured Playlist",
        subtitle:
          playlist.copywriter?.trim() ||
          `${Math.max(0, Number(playlist.trackCount ?? 0))} curated tracks ready for streaming.`,
        coverUrl: playlist.picUrl?.trim() || playlist.coverImgUrl?.trim() || null,
        trackCount: Math.max(0, Number(playlist.trackCount ?? 0))
      }));
    },
    getPlaylistCategories: async (): Promise<OnlinePlaylistCategory[]> => {
      const categories = await enhancedClient.getPlaylistCategories().catch(() => []);
      return categories.map((category) => ({
        name: category.name?.trim() || "",
        group: category.group?.trim() || null,
        hot: category.hot === true
      }));
    },
    getPlaylistsByCategory: async (category: string, limit = 6): Promise<OnlinePlaylistRecommendation[]> => {
      const playlists = await enhancedClient.getPlaylistsByCategory(category, limit).catch(() => []);
      return playlists.map((playlist) => ({
        id: String(playlist.id),
        title: playlist.name?.trim() || category,
        subtitle:
          playlist.copywriter?.trim() ||
          `${Math.max(0, Number(playlist.trackCount ?? 0))} curated tracks ready for streaming.`,
        coverUrl: playlist.picUrl?.trim() || playlist.coverImgUrl?.trim() || null,
        trackCount: Math.max(0, Number(playlist.trackCount ?? 0))
      }));
    },
    getRecommendedPlaylists: async (limit = 6): Promise<OnlinePlaylistRecommendation[]> => {
      const playlists = await enhancedClient.getRecommendedPlaylists(limit).catch(() => []);
      return playlists.map((playlist) => ({
        id: String(playlist.id),
        title: playlist.name?.trim() || "Recommended Playlist",
        subtitle:
          playlist.copywriter?.trim() ||
          `${Math.max(0, Number(playlist.trackCount ?? 0))} curated tracks ready for streaming.`,
        coverUrl: playlist.picUrl?.trim() || playlist.coverImgUrl?.trim() || null,
        trackCount: Math.max(0, Number(playlist.trackCount ?? 0))
      }));
    },
    getPlaylistDetail: async (playlistId: string): Promise<OnlinePlaylistDetail | null> => {
      const detail = await enhancedClient.getPlaylistDetail(playlistId).catch(() => null);
      if (!detail) {
        return null;
      }

      const tracks = Array.isArray(detail.tracks)
        ? detail.tracks.map((track) => repository.upsertPlayableItem(mapSongToPlayableInput(track)))
        : [];

      return {
        id: String(detail.id),
        name: detail.name?.trim() || "Online Playlist",
        description: detail.description?.trim() || "A streamed playlist fetched from your online recommendation flow.",
        coverUrl: detail.coverImgUrl?.trim() || null,
        items: tracks,
        trackCount: Math.max(0, Number(detail.trackCount ?? tracks.length)),
        totalDurationSeconds: tracks.reduce((sum, track) => sum + track.duration, 0),
        updatedAt: Number.isFinite(Number(detail.updateTime)) ? new Date(Number(detail.updateTime)).toISOString() : null
      };
    },
    getTrack: async (itemId: string) => {
      const existing = await ensureOnlineItem(itemId);
      if (existing) {
        return existing;
      }

      return null;
    },
    getLyrics: async (itemId: string): Promise<LyricsResponse> => {
      const item = await ensureOnlineItem(itemId);
      if (!item?.providerItemId) {
        return {
          trackId: itemId,
          source: "none",
          lines: []
        };
      }

      const payload = await enhancedClient.getLyrics(item.providerItemId);
      const lrc = asRecord(payload.lrc);
      const lyric = typeof lrc?.lyric === "string" ? lrc.lyric : null;
      if (!lyric) {
        return {
          trackId: itemId,
          source: "none",
          lines: []
        };
      }

      const snapshot = createLyricsSnapshot(itemId as never, lyric, "lrc");
      if (snapshot.source === "none") {
        return {
          trackId: itemId,
          source: "none",
          lines: []
        };
      }

      return mapLyricsSnapshot(itemId, snapshot, "remote");
    }
  };
};
