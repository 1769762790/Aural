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
  ipcMain.handle(`${IPC_CHANNELS.collection}:toggleFavorite`, (_event, trackId) =>
    services.collection.toggleFavorite(trackId)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:getFavorites`, () => services.collection.getFavorites());
  ipcMain.handle(`${IPC_CHANNELS.collection}:getRecentHistory`, (_event, limit) =>
    services.collection.getRecentHistory(limit)
  );
  ipcMain.handle(`${IPC_CHANNELS.collection}:recordPlay`, (_event, trackId) => services.collection.recordPlay(trackId));

  ipcMain.handle(`${IPC_CHANNELS.settings}:getAll`, () => services.settings.getAll());
  ipcMain.handle(`${IPC_CHANNELS.settings}:getSetting`, (_event, key) => services.settings.getSetting(key));
  ipcMain.handle(`${IPC_CHANNELS.settings}:setSetting`, (_event, key, value) =>
    services.settings.setSetting(key, value)
  );
  ipcMain.handle(`${IPC_CHANNELS.audio}:analyzeReplayGain`, (_event, trackId) =>
    services.audio.analyzeReplayGain(trackId)
  );

  ipcMain.handle(`${IPC_CHANNELS.lyrics}:getLyrics`, (_event, trackId) => services.lyrics.getLyrics(trackId));
};
