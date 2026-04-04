import { createRequire } from "node:module";

export interface EnhancedSearchSong {
  id: number;
  name: string;
  ar?: Array<{ id?: number; name?: string }>;
  artists?: Array<{ id?: number; name?: string }>;
  al?: {
    name?: string;
    picUrl?: string;
  };
  album?: {
    name?: string;
    picUrl?: string;
  };
  alia?: string[];
  dt?: number;
  duration?: number;
}

export interface EnhancedSearchArtist {
  id: number;
  name?: string;
  picUrl?: string;
  img1v1Url?: string;
  albumSize?: number;
  musicSize?: number;
}

export interface EnhancedPlaylistSummary {
  id: number;
  name?: string;
  copywriter?: string;
  picUrl?: string;
  coverImgUrl?: string;
  trackCount?: number;
}

export interface EnhancedPlaylistCategory {
  name?: string;
  category?: number;
  hot?: boolean;
}

export interface EnhancedPlaylistDetail {
  id: number;
  name?: string;
  description?: string;
  coverImgUrl?: string;
  trackCount?: number;
  updateTime?: number;
  tracks?: EnhancedSearchSong[];
}

export interface EnhancedUserPlaylist {
  id: number;
  name?: string;
  specialType?: number;
  trackCount?: number;
  creator?: {
    userId?: number;
  };
}

export interface EnhancedOnlineAlbumSummary {
  id: string;
  title: string;
  artist: string;
  subtitle: string;
  coverUrl: string | null;
  publishTime: string | null;
  year: number | null;
}

export interface EnhancedOnlineAlbumDetail extends EnhancedOnlineAlbumSummary {
  description: string;
  company: string | null;
  songs: EnhancedSearchSong[];
  trackCount: number;
}

export interface EnhancedChartPreviewEntry {
  rank: number;
  title: string;
  artist: string;
}

export interface EnhancedChartSummary {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  coverUrl: string | null;
  updateFrequency: string | null;
  trackCount: number;
  preview: EnhancedChartPreviewEntry[];
}

export interface EnhancedUserProfile {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

interface EnhancedClientPayload {
  [key: string]: string | number | undefined;
}

interface EnhancedClientOptions {
  resolveCookie?: () => string | null;
}

const require = createRequire(import.meta.url);
const enhancedApi = require("@neteasecloudmusicapienhanced/api") as {
  search: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  song_detail: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  song_url_v1: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  lyric: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  likelist: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  login_qr_key: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  login_qr_create: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  login_qr_check: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  user_account: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  user_playlist: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  playlist_track_all: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  personal_fm: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  fm_trash: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  recommend_songs: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  artist_list: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  top_artists: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  artist_top_song: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  album_newest: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  recommend_resource: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  top_playlist: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  top_playlist_highquality: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  playlist_catlist: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  playlist_detail: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  album_new: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  album: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
  toplist_detail: (params: EnhancedClientPayload) => Promise<{ status: number; body: Record<string, unknown> }>;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const readSearchSongs = (payload: Record<string, unknown>) => {
  const result = asRecord(payload.result);
  return Array.isArray(result?.songs) ? (result.songs as EnhancedSearchSong[]) : [];
};

const readSearchArtists = (payload: Record<string, unknown>) => {
  const result = asRecord(payload.result);
  return Array.isArray(result?.artists) ? (result.artists as EnhancedSearchArtist[]) : [];
};

const readTopLevelSongs = (payload: Record<string, unknown>) =>
  Array.isArray(payload.songs) ? (payload.songs as EnhancedSearchSong[]) : readSearchSongs(payload);

const readLikeList = (payload: Record<string, unknown>) => {
  if (Array.isArray(payload.ids)) {
    return payload.ids
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  return [] as string[];
};

const readUserId = (payload: Record<string, unknown>) => {
  const data = asRecord(payload.data);
  const nestedPayload = data ?? payload;
  const account = asRecord(nestedPayload.account);
  const profile = asRecord(nestedPayload.profile);
  const candidate = account?.id ?? profile?.userId ?? nestedPayload.userId;
  return candidate === undefined || candidate === null ? null : String(candidate);
};

const readUserProfile = (payload: Record<string, unknown>): EnhancedUserProfile | null => {
  const data = asRecord(payload.data);
  const nestedPayload = data ?? payload;
  const account = asRecord(payload.account);
  const profile = asRecord(payload.profile);
  const resolvedAccount = asRecord(nestedPayload.account) ?? account;
  const resolvedProfile = asRecord(nestedPayload.profile) ?? profile;
  const candidate = resolvedAccount?.id ?? resolvedProfile?.userId ?? nestedPayload.userId;
  if (candidate === undefined || candidate === null) {
    return null;
  }

  const nickname = firstNonEmptyString(
    resolvedProfile?.nickname,
    resolvedAccount?.userName,
    nestedPayload.nickname
  ) ?? `User ${candidate}`;
  const avatarUrl = firstNonEmptyString(
    resolvedProfile?.avatarUrl,
    resolvedProfile?.avatarImgIdStr,
    nestedPayload.avatarUrl
  );

  return {
    userId: String(candidate),
    nickname,
    avatarUrl
  };
};

const readTopLevelArtists = (payload: Record<string, unknown>) =>
  Array.isArray(payload.artists) ? (payload.artists as EnhancedSearchArtist[]) : readSearchArtists(payload);

const readRecommendedPlaylists = (payload: Record<string, unknown>) =>
  Array.isArray(payload.recommend) ? (payload.recommend as EnhancedPlaylistSummary[]) : [];

const readTopPlaylists = (payload: Record<string, unknown>) =>
  Array.isArray(payload.playlists) ? (payload.playlists as EnhancedPlaylistSummary[]) : [];

const readPlaylistCategories = (payload: Record<string, unknown>) => {
  const categoriesRecord = asRecord(payload.categories) ?? {};
  const categoriesById = new Map<number, string>();

  Object.entries(categoriesRecord).forEach(([key, value]) => {
    if (typeof value !== "string") {
      return;
    }
    const normalizedKey = Number(key);
    if (Number.isFinite(normalizedKey)) {
      categoriesById.set(normalizedKey, value.trim());
    }
  });

  const sub = Array.isArray(payload.sub) ? (payload.sub as EnhancedPlaylistCategory[]) : [];

  return sub
    .map((entry) => ({
      name: entry.name?.trim() || "",
      group: categoriesById.get(Number(entry.category ?? -1)) ?? null,
      hot: entry.hot === true
    }))
    .filter((entry) => entry.name.length > 0);
};

const readPlaylistDetail = (payload: Record<string, unknown>) => {
  const playlist = asRecord(payload.playlist);
  return playlist ? (playlist as unknown as EnhancedPlaylistDetail) : null;
};

const readUserPlaylists = (payload: Record<string, unknown>) =>
  Array.isArray(payload.playlist) ? (payload.playlist as EnhancedUserPlaylist[]) : [];

const readPersonalFmSongs = (payload: Record<string, unknown>) =>
  Array.isArray(payload.data) ? (payload.data as EnhancedSearchSong[]) : [];

const readDailyRecommendedSongs = (payload: Record<string, unknown>) => {
  const data = asRecord(payload.data);
  if (Array.isArray(data?.dailySongs)) {
    return data.dailySongs as EnhancedSearchSong[];
  }

  if (Array.isArray(payload.dailySongs)) {
    return payload.dailySongs as EnhancedSearchSong[];
  }

  if (Array.isArray(data?.songs)) {
    return data.songs as EnhancedSearchSong[];
  }

  return [];
};

const normalizeChartPreview = (value: unknown): EnhancedChartPreviewEntry | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const title = firstNonEmptyString(record.first, record.name);
  const artist = firstNonEmptyString(record.second, record.artist);
  if (!title || !artist) {
    return null;
  }

  return {
    rank: Math.max(1, Number(record.rank ?? 0)),
    title,
    artist
  };
};

const readToplistDetail = (payload: Record<string, unknown>) => {
  const list = Array.isArray(payload.list) ? payload.list : [];

  return list
    .map((entry) => {
      const record = asRecord(entry);
      if (!record || record.id === undefined || record.id === null) {
        return null;
      }

      const previewSource = Array.isArray(record.tracks) ? record.tracks : [];
      const preview = previewSource
        .map((track, index) => {
          const normalized = normalizeChartPreview(track);
          return normalized ? { ...normalized, rank: index + 1 } : null;
        })
        .filter((track): track is EnhancedChartPreviewEntry => Boolean(track))
        .slice(0, 3);

      const title = firstNonEmptyString(record.name) ?? `Chart ${record.id}`;

      return {
        id: String(record.id),
        title,
        subtitle: firstNonEmptyString(record.description, record.commentThreadId, record.ToplistType) ?? "Curated chart discovery",
        badge: firstNonEmptyString(record.updateFrequency, record.category) ?? "Chart",
        coverUrl: firstNonEmptyString(record.coverImgUrl, record.picUrl),
        updateFrequency: firstNonEmptyString(record.updateFrequency),
        trackCount: Math.max(0, Number(record.trackCount ?? 0)),
        preview
      } satisfies EnhancedChartSummary;
    })
    .filter((entry): entry is EnhancedChartSummary => Boolean(entry));
};

const parseArtistLabel = (value: unknown): string => {
  if (typeof value === "string" && value.trim().length) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const names = value
      .map((entry) => {
        const record = asRecord(entry);
        if (!record) {
          return null;
        }
        const name = record.name ?? record.artistName;
        return typeof name === "string" && name.trim().length ? name.trim() : null;
      })
      .filter((entry): entry is string => Boolean(entry));
    if (names.length) {
      return names.join(", ");
    }
  }

  const record = asRecord(value);
  if (!record) {
    return "Unknown Artist";
  }

  const nestedName = record.name ?? record.artistName;
  return typeof nestedName === "string" && nestedName.trim().length ? nestedName.trim() : "Unknown Artist";
};

const firstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length) {
      return value.trim();
    }
  }

  return null;
};

const resolveAlbumCoverUrl = (source: Record<string, unknown>, record: Record<string, unknown>) => {
  const nestedSourceCandidates = [
    asRecord(source.cover),
    asRecord(source.albumPic),
    asRecord(source.resource),
    asRecord(record.cover),
    asRecord(record.albumPic),
    asRecord(record.resource)
  ].filter((entry): entry is Record<string, unknown> => Boolean(entry));

  const directUrl = firstNonEmptyString(
    source.picUrl,
    source.coverImgUrl,
    source.albumPicUrl,
    source.coverUrl,
    source.blurPicUrl,
    source.imageUrl,
    source.pic,
    record.picUrl,
    record.coverImgUrl,
    record.albumPicUrl,
    record.coverUrl,
    record.blurPicUrl,
    record.imageUrl,
    record.pic
  );

  if (directUrl) {
    return directUrl;
  }

  for (const candidate of nestedSourceCandidates) {
    const nestedUrl = firstNonEmptyString(
      candidate.picUrl,
      candidate.coverImgUrl,
      candidate.albumPicUrl,
      candidate.coverUrl,
      candidate.blurPicUrl,
      candidate.imageUrl,
      candidate.pic
    );
    if (nestedUrl) {
      return nestedUrl;
    }
  }

  return null;
};

const normalizePublishTime = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return new Date(parsed).toISOString();
};

const normalizeAlbumSummary = (rawValue: unknown): EnhancedOnlineAlbumSummary | null => {
  const record = asRecord(rawValue);
  if (!record) {
    return null;
  }

  const nestedAlbum = asRecord(record.album);
  const source = nestedAlbum ?? record;
  const albumId = source.id ?? record.albumId ?? record.id;
  if (albumId === undefined || albumId === null) {
    return null;
  }

  const publishTime = normalizePublishTime(source.publishTime ?? record.publishTime ?? source.pubTime ?? record.pubTime);
  const year = publishTime ? new Date(publishTime).getUTCFullYear() : null;

  return {
    id: String(albumId),
    title:
      (typeof source.name === "string" && source.name.trim()) ||
      (typeof source.albumName === "string" && source.albumName.trim()) ||
      `Album ${albumId}`,
    artist: parseArtistLabel(source.artistName ?? source.artists ?? source.artist ?? record.artistName ?? record.artists),
    subtitle:
      (typeof source.albumSubName === "string" && source.albumSubName.trim()) ||
      (typeof source.description === "string" && source.description.trim()) ||
      (typeof source.company === "string" && source.company.trim()) ||
      "Album",
    coverUrl: resolveAlbumCoverUrl(source, record),
    publishTime,
    year
  };
};

const readAlbumNew = (payload: Record<string, unknown>) => {
  const candidates = [payload.albums, payload.monthData, payload.data];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    return candidate
      .map((entry) => normalizeAlbumSummary(entry))
      .filter((entry): entry is EnhancedOnlineAlbumSummary => Boolean(entry));
  }

  return [] as EnhancedOnlineAlbumSummary[];
};

const readAlbumNewest = (payload: Record<string, unknown>) => {
  const albums = Array.isArray(payload.albums) ? payload.albums : [];
  return albums
    .map((entry) => normalizeAlbumSummary(entry))
    .filter((entry): entry is EnhancedOnlineAlbumSummary => Boolean(entry));
};

const readAlbumDetail = (payload: Record<string, unknown>): EnhancedOnlineAlbumDetail | null => {
  const rootCandidates = [payload.album, payload.data, payload];
  const source = rootCandidates
    .map((entry) => asRecord(entry))
    .find((entry) => entry && (entry.id !== undefined || entry.albumId !== undefined));

  if (!source) {
    return null;
  }

  const normalizedSummary = normalizeAlbumSummary(source);
  if (!normalizedSummary) {
    return null;
  }

  const songCandidates = [payload.songs, source.songs, payload.songList, source.songList, payload.songsData];
  const songs = songCandidates.find((entry) => Array.isArray(entry));
  const alias = Array.isArray(source.alias)
    ? source.alias
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .join(" / ")
    : "";

  return {
    ...normalizedSummary,
    description:
      (typeof source.description === "string" && source.description.trim()) ||
      (typeof source.albumSubName === "string" && source.albumSubName.trim()) ||
      alias ||
      `${normalizedSummary.title} by ${normalizedSummary.artist}.`,
    company: (typeof source.company === "string" && source.company.trim()) || null,
    songs: Array.isArray(songs) ? (songs as EnhancedSearchSong[]) : [],
    trackCount: Array.isArray(songs) ? songs.length : Math.max(0, Number(source.size ?? source.songCount ?? 0))
  };
};

const logEnhancedRequest = (pathname: string, payload: Record<string, string | number>) => {
  // console.log(`[online:enhanced-sdk] ${pathname}`, payload);
};

const logEnhancedResponse = (pathname: string, status: number) => {
  // console.log(`[online:enhanced-sdk] ${pathname} -> ${status}`);
};

const toPayload = (params: EnhancedClientPayload) => {
  const payload: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length) {
      payload[key] = value;
    }
  });
  return payload;
};

export const createEnhancedClient = (_baseUrlOrOptions?: string | EnhancedClientOptions) => {
  const options =
    _baseUrlOrOptions && typeof _baseUrlOrOptions === "object" ? _baseUrlOrOptions : ({} as EnhancedClientOptions);

  const requestEnhancedJson = async (
    pathname: string,
    params: EnhancedClientPayload,
    fn: (payload: Record<string, string | number>) => Promise<{ status: number; body: Record<string, unknown> }>
  ) => {
    const explicitCookie = typeof params.cookie === "string" && params.cookie.trim().length ? params.cookie.trim() : null;
    const resolvedCookie = explicitCookie ?? options.resolveCookie?.() ?? null;
    const payload = toPayload({
      ...params,
      cookie: resolvedCookie ?? undefined
    });
    logEnhancedRequest(pathname, payload);
    const response = await fn(payload);
    logEnhancedResponse(pathname, response.status);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Enhanced SDK request failed: ${response.status}`);
    }

    return response.body;
  };

  return {
  searchSongs: async (term: string, page = 1, limit = 20) => {
    const payload = await requestEnhancedJson(
      "/search",
      {
        keywords: term,
        type: 1,
        limit,
        offset: Math.max(0, (page - 1) * limit)
      },
      enhancedApi.search
    );
    return readSearchSongs(payload);
  },
  searchArtists: async (term: string, limit = 10) => {
    const payload = await requestEnhancedJson(
      "/search",
      {
        keywords: term,
        type: 100,
        limit,
        offset: 0
      },
      enhancedApi.search
    );
    return readSearchArtists(payload);
  },
  getSongDetail: async (providerItemId: string) => {
    const payload = await requestEnhancedJson(
      "/song/detail",
      {
        ids: `[${providerItemId}]`
      },
      enhancedApi.song_detail
    );
    return Array.isArray(payload.songs) ? ((payload.songs[0] as EnhancedSearchSong | undefined) ?? null) : null;
  },
  getSongDetails: async (providerItemIds: string[], cookie?: string) => {
    if (!providerItemIds.length) {
      return [] as EnhancedSearchSong[];
    }

    const payload = await requestEnhancedJson(
      "/song/detail",
      {
        ids: `[${providerItemIds.join(",")}]`,
        cookie
      },
      enhancedApi.song_detail
    );
    return Array.isArray(payload.songs) ? (payload.songs as EnhancedSearchSong[]) : [];
  },
  getLyrics: async (providerItemId: string) =>
    requestEnhancedJson(
      "/lyric",
      {
        id: providerItemId
      },
      enhancedApi.lyric
    ),
  getCurrentUserId: async (cookie?: string) => {
    const payload = await requestEnhancedJson(
      "/user/account",
      {
        cookie
      },
      enhancedApi.user_account
    );
    return readUserId(payload);
  },
  getCurrentUser: async (cookie?: string) => {
    const payload = await requestEnhancedJson(
      "/user/account",
      {
        cookie
      },
      enhancedApi.user_account
    );
    return readUserProfile(payload);
  },
  createQrLoginSession: async () => {
    const keyPayload = await requestEnhancedJson("/login/qr/key", {}, enhancedApi.login_qr_key);
    const keyData = asRecord(keyPayload.data);
    const key = firstNonEmptyString(keyData?.unikey, keyPayload.unikey);
    if (!key) {
      throw new Error("Failed to create QR login key.");
    }

    const createPayload = await requestEnhancedJson(
      "/login/qr/create",
      {
        key,
        qrimg: "true"
      },
      enhancedApi.login_qr_create
    );
    const createData = asRecord(createPayload.data);
    const qrUrl = firstNonEmptyString(createData?.qrurl);
    if (!qrUrl) {
      throw new Error("Failed to create QR login image.");
    }

    return {
      key,
      qrUrl,
      qrImageUrl: firstNonEmptyString(createData?.qrimg)
    };
  },
  checkQrLoginSession: async (key: string) =>
    requestEnhancedJson(
      "/login/qr/check",
      {
        key
      },
      enhancedApi.login_qr_check
    ),
  getLikedSongIds: async (uid: string, cookie?: string) => {
    const payload = await requestEnhancedJson(
      "/likelist",
      {
        uid,
        cookie
      },
      enhancedApi.likelist
    );
    return readLikeList(payload);
  },
  getDailyRecommendedSongs: async () => {
    const payload = await requestEnhancedJson("/recommend/songs", {}, enhancedApi.recommend_songs);
    return readDailyRecommendedSongs(payload);
  },
  getPersonalFmSongs: async () => {
    const payload = await requestEnhancedJson("/personal_fm", {}, enhancedApi.personal_fm);
    return readPersonalFmSongs(payload);
  },
  trashPersonalFmSong: async (songId: string) => {
    await requestEnhancedJson(
      "/fm_trash",
      {
        id: songId,
        time: 25
      },
      enhancedApi.fm_trash
    );
    return true;
  },
  getUserPlaylists: async (uid: string, cookie?: string) => {
    const payload = await requestEnhancedJson(
      "/user/playlist",
      {
        uid,
        limit: 200,
        offset: 0,
        cookie
      },
      enhancedApi.user_playlist
    );
    return readUserPlaylists(payload);
  },
  getPlaylistTrackAll: async (playlistId: string, cookie?: string) => {
    const payload = await requestEnhancedJson(
      "/playlist/track/all",
      {
        id: playlistId,
        limit: 1000,
        offset: 0,
        cookie
      },
      enhancedApi.playlist_track_all
    );
    return readTopLevelSongs(payload);
  },
  listArtists: async (initial: string | number = -1, offset = 0, limit = 60, area = -1, type = -1) => {
    const payload = await requestEnhancedJson(
      "/artist/list",
      {
        type: String(type),
        area: String(area),
        initial: typeof initial === "number" ? String(initial) : initial,
        limit,
        offset
      },
      enhancedApi.artist_list
    );
    return readTopLevelArtists(payload);
  },
  getTopArtists: async (limit = 50, offset = 0) => {
    const payload = await requestEnhancedJson(
      "/top/artists",
      {
        limit,
        offset
      },
      enhancedApi.top_artists
    );
    return readTopLevelArtists(payload);
  },
  getArtistTopSongs: async (artistId: string) => {
    const payload = await requestEnhancedJson(
      "/artist/top/song",
      {
        id: artistId
      },
      enhancedApi.artist_top_song
    );
    return readTopLevelSongs(payload);
  },
  getNewestAlbums: async (limit = 10) => {
    const payload = await requestEnhancedJson("/album/newest", {}, enhancedApi.album_newest);
    return readAlbumNewest(payload).slice(0, Math.max(1, Math.min(50, limit)));
  },
  getDailyRecommendedPlaylists: async () => {
    const payload = await requestEnhancedJson("/recommend/resource", {}, enhancedApi.recommend_resource);
    return readRecommendedPlaylists(payload);
  },
  getHighqualityPlaylists: async (limit = 6) => {
    const payload = await requestEnhancedJson(
      "/top/playlist/highquality",
      {
        limit
      },
      enhancedApi.top_playlist_highquality
    );
    return readTopPlaylists(payload);
  },
  getPlaylistCategories: async () => {
    const payload = await requestEnhancedJson("/playlist/catlist", {}, enhancedApi.playlist_catlist);
    return readPlaylistCategories(payload);
  },
  getPlaylistsByCategory: async (category: string, limit = 6) => {
    const payload = await requestEnhancedJson(
      "/top/playlist",
      {
        cat: category,
        limit,
        order: "hot"
      },
      enhancedApi.top_playlist
    );
    return readTopPlaylists(payload);
  },
  getRecommendedPlaylists: async (limit = 6) => {
    const payload = await requestEnhancedJson(
      "/top/playlist",
      {
        limit,
        order: "new"
      },
      enhancedApi.top_playlist
    );
    return readTopPlaylists(payload);
  },
  getPlaylistDetail: async (playlistId: string) => {
    const payload = await requestEnhancedJson(
      "/playlist/detail",
      {
        id: playlistId,
        s: 0
      },
      enhancedApi.playlist_detail
    );
    return readPlaylistDetail(payload);
  },
  getAlbumsByArea: async (area: "ALL" | "ZH" | "EA" | "KR" | "JP" = "ALL", offset = 0, limit = 30) => {
    const payload = await requestEnhancedJson(
      "/album/new",
      {
        area,
        limit,
        offset
      },
      enhancedApi.album_new
    );
    return readAlbumNew(payload);
  },
  getAlbumDetail: async (albumId: string) => {
    const payload = await requestEnhancedJson(
      "/album",
      {
        id: albumId
      },
      enhancedApi.album
    );
    return readAlbumDetail(payload);
  },
  getChartsOverview: async () => {
    const payload = await requestEnhancedJson("/toplist/detail", {}, enhancedApi.toplist_detail);
    return readToplistDetail(payload);
  },
  getSongUrl: async (providerItemId: string) =>
    requestEnhancedJson(
      "/song/url/v1",
      {
        id: providerItemId,
        level: "exhigh"
      },
      enhancedApi.song_url_v1
    )
  };
};
