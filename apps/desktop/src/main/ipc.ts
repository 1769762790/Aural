import { BrowserWindow, ipcMain } from "electron";
import { IPC_CHANNELS, type AuralBridge } from "@aural/contracts";
import { chooseFolders, openPath } from "./system";

type BusinessBridge = Omit<AuralBridge, "system">;

export const registerIpcHandlers = (services: BusinessBridge) => {
  ipcMain.handle(`${IPC_CHANNELS.system}:chooseFolders`, () => chooseFolders());
  ipcMain.handle(`${IPC_CHANNELS.system}:openPath`, (_event, targetPath: string) => openPath(targetPath));
  ipcMain.handle(`${IPC_CHANNELS.system}:setTitleBarTheme`, (event, theme: "light" | "dark") => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow || process.platform === "darwin") {
      return;
    }

    targetWindow.setTitleBarOverlay({
      color: "#00000000",
      symbolColor: theme === "light" ? "#2d3340" : "#f5f7fb",
      height: 52
    });
  });

  ipcMain.handle(`${IPC_CHANNELS.library}:importFolders`, (_event, paths: string[]) => services.library.importFolders(paths));
  ipcMain.handle(`${IPC_CHANNELS.library}:rescanFolders`, () => services.library.rescanFolders());
  ipcMain.handle(`${IPC_CHANNELS.library}:removeFolder`, (_event, targetPath: string) => services.library.removeFolder(targetPath));
  ipcMain.handle(`${IPC_CHANNELS.library}:deleteTrackFromDevice`, (_event, trackId) =>
    services.library.deleteTrackFromDevice(trackId)
  );
  ipcMain.handle(`${IPC_CHANNELS.library}:updateTrackMetadata`, (_event, input) =>
    services.library.updateTrackMetadata(input)
  );
  ipcMain.handle(`${IPC_CHANNELS.library}:getOverview`, () => services.library.getOverview());
  ipcMain.handle(`${IPC_CHANNELS.library}:listTracks`, (_event, query) => services.library.listTracks(query));
  ipcMain.handle(`${IPC_CHANNELS.library}:getArtistDetail`, (_event, artistId) => services.library.getArtistDetail(artistId));
  ipcMain.handle(`${IPC_CHANNELS.library}:getAlbumDetail`, (_event, albumId) => services.library.getAlbumDetail(albumId));
  ipcMain.handle(`${IPC_CHANNELS.library}:listArtists`, (_event, query) => services.library.listArtists(query));
  ipcMain.handle(`${IPC_CHANNELS.library}:listAlbums`, (_event, query) => services.library.listAlbums(query));
  ipcMain.handle(`${IPC_CHANNELS.library}:listFolders`, (_event, query) => services.library.listFolders(query));

  ipcMain.handle(`${IPC_CHANNELS.search}:searchTracks`, (_event, query) => services.search.searchTracks(query));
  ipcMain.handle(`${IPC_CHANNELS.search}:searchArtists`, (_event, query) => services.search.searchArtists(query));
  ipcMain.handle(`${IPC_CHANNELS.search}:searchAlbums`, (_event, query) => services.search.searchAlbums(query));
  ipcMain.handle(`${IPC_CHANNELS.search}:searchPlaylists`, (_event, query) => services.search.searchPlaylists(query));
  ipcMain.handle(`${IPC_CHANNELS.search}:searchAll`, (_event, query) => services.search.searchAll(query));

  ipcMain.handle(`${IPC_CHANNELS.collection}:listPlaylists`, () => services.collection.listPlaylists());
  ipcMain.handle(`${IPC_CHANNELS.collection}:getPlaylist`, (_event, playlistId) => services.collection.getPlaylist(playlistId));
  ipcMain.handle(`${IPC_CHANNELS.collection}:createPlaylist`, (_event, input) => services.collection.createPlaylist(input));
  ipcMain.handle(`${IPC_CHANNELS.collection}:renamePlaylist`, (_event, playlistId, name) =>
    services.collection.renamePlaylist(playlistId, name)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:deletePlaylist`, (_event, playlistId) =>
    services.collection.deletePlaylist(playlistId)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:addToPlaylist`, (_event, input) => services.collection.addToPlaylist(input));
  ipcMain.handle(`${IPC_CHANNELS.collection}:removeFromPlaylist`, (_event, input) =>
    services.collection.removeFromPlaylist(input)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:toggleFavorite`, (_event, itemId) =>
    services.collection.toggleFavorite(itemId)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:getFavorites`, (_event, mode) => services.collection.getFavorites(mode));
  ipcMain.handle(`${IPC_CHANNELS.collection}:getRecentHistory`, (_event, limit, mode) =>
    services.collection.getRecentHistory(limit, mode)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:recordPlay`, (_event, itemId, sourceType, sourceId) =>
    services.collection.recordPlay(itemId, sourceType, sourceId)
  );

  ipcMain.handle(`${IPC_CHANNELS.online}:searchTracks`, (_event, query) => services.online.searchTracks(query));
  ipcMain.handle(`${IPC_CHANNELS.online}:getCurrentUser`, () => services.online.getCurrentUser());
  ipcMain.handle(`${IPC_CHANNELS.online}:createQrLoginSession`, () => services.online.createQrLoginSession());
  ipcMain.handle(`${IPC_CHANNELS.online}:checkQrLoginSession`, (_event, key) => services.online.checkQrLoginSession(key));
  ipcMain.handle(`${IPC_CHANNELS.online}:getLikedTracks`, () => services.online.getLikedTracks());
  ipcMain.handle(`${IPC_CHANNELS.online}:getDailyRecommendedSongs`, () => services.online.getDailyRecommendedSongs());
  ipcMain.handle(`${IPC_CHANNELS.online}:getPersonalFmTracks`, () => services.online.getPersonalFmTracks());
  ipcMain.handle(`${IPC_CHANNELS.online}:trashPersonalFmTrack`, (_event, itemId) => services.online.trashPersonalFmTrack(itemId));
  ipcMain.handle(`${IPC_CHANNELS.online}:getTopArtists`, (_event, limit) => services.online.getTopArtists(limit));
  ipcMain.handle(`${IPC_CHANNELS.online}:listArtists`, (_event, query) => services.online.listArtists(query));
  ipcMain.handle(`${IPC_CHANNELS.online}:getArtistDetail`, (_event, artistId) => services.online.getArtistDetail(artistId));
  ipcMain.handle(`${IPC_CHANNELS.online}:getNewestAlbums`, (_event, limit) => services.online.getNewestAlbums(limit));
  ipcMain.handle(`${IPC_CHANNELS.online}:listAlbums`, (_event, query) => services.online.listAlbums(query));
  ipcMain.handle(`${IPC_CHANNELS.online}:getAlbumDetail`, (_event, albumId) => services.online.getAlbumDetail(albumId));
  ipcMain.handle(`${IPC_CHANNELS.online}:getChartsOverview`, () => services.online.getChartsOverview());
  ipcMain.handle(`${IPC_CHANNELS.online}:getDailyRecommendedPlaylists`, () => services.online.getDailyRecommendedPlaylists());
  ipcMain.handle(`${IPC_CHANNELS.online}:getHighqualityPlaylists`, (_event, limit) => services.online.getHighqualityPlaylists(limit));
  ipcMain.handle(`${IPC_CHANNELS.online}:getPlaylistCategories`, () => services.online.getPlaylistCategories());
  ipcMain.handle(`${IPC_CHANNELS.online}:getPlaylistsByCategory`, (_event, category, limit) =>
    services.online.getPlaylistsByCategory(category, limit)
  );
  ipcMain.handle(`${IPC_CHANNELS.online}:getRecommendedPlaylists`, (_event, limit) => services.online.getRecommendedPlaylists(limit));
  ipcMain.handle(`${IPC_CHANNELS.online}:getPlaylistDetail`, (_event, playlistId) => services.online.getPlaylistDetail(playlistId));
  ipcMain.handle(`${IPC_CHANNELS.online}:getTrack`, (_event, itemId) => services.online.getTrack(itemId));
  ipcMain.handle(`${IPC_CHANNELS.online}:resolvePlayback`, (_event, itemId) => services.online.resolvePlayback(itemId));
  ipcMain.handle(`${IPC_CHANNELS.online}:getLyrics`, (_event, itemId) => services.online.getLyrics(itemId));
  ipcMain.handle(`${IPC_CHANNELS.online}:download`, (_event, itemId) => services.online.download(itemId));
  ipcMain.handle(`${IPC_CHANNELS.online}:listDownloads`, () => services.online.listDownloads());
  ipcMain.handle(`${IPC_CHANNELS.online}:getDefaultDownloadDirectory`, () => services.online.getDefaultDownloadDirectory());
  ipcMain.handle(`${IPC_CHANNELS.online}:getDefaultCacheDirectory`, () => services.online.getDefaultCacheDirectory());
  ipcMain.handle(`${IPC_CHANNELS.online}:clearCachedMedia`, () => services.online.clearCachedMedia());

  ipcMain.handle(`${IPC_CHANNELS.settings}:getAll`, () => services.settings.getAll());
  ipcMain.handle(`${IPC_CHANNELS.settings}:getSetting`, (_event, key) => services.settings.getSetting(key));
  ipcMain.handle(`${IPC_CHANNELS.settings}:setSetting`, (_event, key, value) =>
    services.settings.setSetting(key, value)
  );
  ipcMain.handle(`${IPC_CHANNELS.settings}:setManySettings`, (_event, records) =>
    services.settings.setManySettings(records)
  );
  ipcMain.handle(`${IPC_CHANNELS.audio}:analyzeReplayGain`, (_event, trackId) =>
    services.audio.analyzeReplayGain(trackId)
  );

  ipcMain.handle(`${IPC_CHANNELS.lyrics}:getLyrics`, (_event, trackId) => services.lyrics.getLyrics(trackId));
};
