import type { AuralRepository } from "@aural/data";
import { createOnlineAuthService } from "./online/auth";
import { createOnlineMetadataService } from "./online/metadata";
import { createOnlinePlaybackService } from "./online/playback";

interface OnlineProviderOptions {
  repository: AuralRepository;
  userDataPath: string;
  resolveSetting: (
    key:
      | "online.downloadDirectory"
      | "online.preferDownloadedCopy"
      | "online.providerBaseUrl"
      | "online.neteaseCookie"
      | "online.cacheDirectory"
      | "online.cacheMaxSizeGb"
      | "online.musicNamingFormat"
  ) => unknown;
}

export const createOnlineService = ({ repository, userDataPath, resolveSetting }: OnlineProviderOptions) => {
  const auth = createOnlineAuthService({ repository });
  const metadata = createOnlineMetadataService({ repository });
  const playback = createOnlinePlaybackService({
    repository,
    userDataPath,
    resolveSetting,
    ensureOnlineItem: metadata.ensureOnlineItem
  });

  return {
    searchTracks: metadata.searchTracks,
    getCurrentUser: auth.getCurrentUser,
    createQrLoginSession: auth.createQrLoginSession,
    checkQrLoginSession: auth.checkQrLoginSession,
    getLikedTracks: metadata.getLikedTracks,
    getDailyRecommendedSongs: metadata.getDailyRecommendedSongs,
    getPersonalFmTracks: metadata.getPersonalFmTracks,
    trashPersonalFmTrack: metadata.trashPersonalFmTrack,
    getTopArtists: metadata.getTopArtists,
    listArtists: metadata.listArtists,
    getArtistDetail: metadata.getArtistDetail,
    getNewestAlbums: metadata.getNewestAlbums,
    listAlbums: metadata.listAlbums,
    getAlbumDetail: metadata.getAlbumDetail,
    getChartsOverview: metadata.getChartsOverview,
    getDailyRecommendedPlaylists: metadata.getDailyRecommendedPlaylists,
    getHighqualityPlaylists: metadata.getHighqualityPlaylists,
    getPlaylistCategories: metadata.getPlaylistCategories,
    getPlaylistsByCategory: metadata.getPlaylistsByCategory,
    getRecommendedPlaylists: metadata.getRecommendedPlaylists,
    getPlaylistDetail: metadata.getPlaylistDetail,
    getTrack: metadata.getTrack,
    resolvePlayback: playback.resolvePlayback,
    getLyrics: metadata.getLyrics,
    download: playback.download,
    listDownloads: playback.listDownloads,
    getDefaultDownloadDirectory: playback.getDefaultDownloadDirectory,
    getDefaultCacheDirectory: playback.getDefaultCacheDirectory,
    clearCachedMedia: playback.clearCachedMedia
  };
};
