import type { AuralRepository } from "@aural/data";
import { createOnlineAuthService } from "./online/auth";
import { createOnlineMetadataService } from "./online/metadata";
import { createOnlinePlaybackService } from "./online/playback";

interface OnlineProviderOptions {
  repository: AuralRepository;
  userDataPath: string;
  resolveSetting: (key: "online.downloadDirectory" | "online.preferDownloadedCopy" | "online.providerBaseUrl") => unknown;
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
    listArtists: metadata.listArtists,
    getArtistDetail: metadata.getArtistDetail,
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
    getDefaultDownloadDirectory: playback.getDefaultDownloadDirectory
  };
};
