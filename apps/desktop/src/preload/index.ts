import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type AuralBridge, type BeforeQuitFlushListener } from "@aural/contracts";

const beforeQuitFlushListeners = new Set<BeforeQuitFlushListener>();
const BEFORE_QUIT_FLUSH_CHANNEL = `${IPC_CHANNELS.system}:beforeQuitFlush`;
const BEFORE_QUIT_FLUSH_ACK_CHANNEL = `${IPC_CHANNELS.system}:beforeQuitFlushAck`;

ipcRenderer.on(BEFORE_QUIT_FLUSH_CHANNEL, async () => {
  try {
    for (const listener of Array.from(beforeQuitFlushListeners)) {
      await listener();
    }
  } finally {
    ipcRenderer.send(BEFORE_QUIT_FLUSH_ACK_CHANNEL);
  }
});

const bridge: AuralBridge = {
  system: {
    chooseFolders: () => ipcRenderer.invoke(`${IPC_CHANNELS.system}:chooseFolders`),
    openPath: (targetPath) => ipcRenderer.invoke(`${IPC_CHANNELS.system}:openPath`, targetPath),
    setTitleBarTheme: (theme) => ipcRenderer.invoke(`${IPC_CHANNELS.system}:setTitleBarTheme`, theme),
    onBeforeQuitFlush: (listener) => {
      beforeQuitFlushListeners.add(listener);

      return () => {
        beforeQuitFlushListeners.delete(listener);
      };
    }
  },
  library: {
    importFolders: (paths) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:importFolders`, paths),
    rescanFolders: () => ipcRenderer.invoke(`${IPC_CHANNELS.library}:rescanFolders`),
    removeFolder: (targetPath) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:removeFolder`, targetPath),
    deleteTrackFromDevice: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:deleteTrackFromDevice`, trackId),
    updateTrackMetadata: (input) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:updateTrackMetadata`, input),
    getOverview: () => ipcRenderer.invoke(`${IPC_CHANNELS.library}:getOverview`),
    listTracks: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:listTracks`, query),
    getArtistDetail: (artistId) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:getArtistDetail`, artistId),
    getAlbumDetail: (albumId) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:getAlbumDetail`, albumId),
    listArtists: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:listArtists`, query),
    listAlbums: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:listAlbums`, query),
    listFolders: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.library}:listFolders`, query)
  },
  search: {
    searchTracks: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.search}:searchTracks`, query),
    searchArtists: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.search}:searchArtists`, query),
    searchAlbums: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.search}:searchAlbums`, query),
    searchPlaylists: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.search}:searchPlaylists`, query),
    searchAll: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.search}:searchAll`, query)
  },
  collection: {
    listPlaylists: () => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:listPlaylists`),
    getPlaylist: (playlistId) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:getPlaylist`, playlistId),
    createPlaylist: (input) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:createPlaylist`, input),
    renamePlaylist: (playlistId, name) =>
      ipcRenderer.invoke(`${IPC_CHANNELS.collection}:renamePlaylist`, playlistId, name),
    deletePlaylist: (playlistId) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:deletePlaylist`, playlistId),
    addToPlaylist: (input) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:addToPlaylist`, input),
    removeFromPlaylist: (input) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:removeFromPlaylist`, input),
    toggleFavorite: (itemId) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:toggleFavorite`, itemId),
    getFavorites: (mode) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:getFavorites`, mode),
    getRecentHistory: (limit, mode) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:getRecentHistory`, limit, mode),
    recordPlay: (itemId, sourceType, sourceId) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:recordPlay`, itemId, sourceType, sourceId)
  },
  online: {
    searchTracks: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:searchTracks`, query),
    listArtists: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:listArtists`, query),
    getArtistDetail: (artistId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getArtistDetail`, artistId),
    listAlbums: (query) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:listAlbums`, query),
    getAlbumDetail: (albumId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getAlbumDetail`, albumId),
    getChartsOverview: () => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getChartsOverview`),
    getDailyRecommendedPlaylists: () => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getDailyRecommendedPlaylists`),
    getHighqualityPlaylists: (limit) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getHighqualityPlaylists`, limit),
    getPlaylistCategories: () => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getPlaylistCategories`),
    getPlaylistsByCategory: (category, limit) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getPlaylistsByCategory`, category, limit),
    getRecommendedPlaylists: (limit) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getRecommendedPlaylists`, limit),
    getPlaylistDetail: (playlistId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getPlaylistDetail`, playlistId),
    getTrack: (itemId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getTrack`, itemId),
    resolvePlayback: (itemId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:resolvePlayback`, itemId),
    getLyrics: (itemId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getLyrics`, itemId),
    download: (itemId) => ipcRenderer.invoke(`${IPC_CHANNELS.online}:download`, itemId),
    listDownloads: () => ipcRenderer.invoke(`${IPC_CHANNELS.online}:listDownloads`),
    getDefaultDownloadDirectory: () => ipcRenderer.invoke(`${IPC_CHANNELS.online}:getDefaultDownloadDirectory`)
  },
  settings: {
    getAll: () => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:getAll`),
    getSetting: (key) => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:getSetting`, key),
    setSetting: (key, value) => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:setSetting`, key, value),
    setManySettings: (records) => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:setManySettings`, records)
  },
  audio: {
    analyzeReplayGain: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.audio}:analyzeReplayGain`, trackId)
  },
  lyrics: {
    getLyrics: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.lyrics}:getLyrics`, trackId)
  }
};

contextBridge.exposeInMainWorld("aural", bridge);
