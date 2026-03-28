import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type AuralBridge } from "@aural/contracts";

const bridge: AuralBridge = {
  system: {
    chooseFolders: () => ipcRenderer.invoke(`${IPC_CHANNELS.system}:chooseFolders`),
    openPath: (targetPath) => ipcRenderer.invoke(`${IPC_CHANNELS.system}:openPath`, targetPath),
    setTitleBarTheme: (theme) => ipcRenderer.invoke(`${IPC_CHANNELS.system}:setTitleBarTheme`, theme)
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
    toggleFavorite: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:toggleFavorite`, trackId),
    getFavorites: () => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:getFavorites`),
    getRecentHistory: (limit) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:getRecentHistory`, limit),
    recordPlay: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.collection}:recordPlay`, trackId)
  },
  settings: {
    getAll: () => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:getAll`),
    getSetting: (key) => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:getSetting`, key),
    setSetting: (key, value) => ipcRenderer.invoke(`${IPC_CHANNELS.settings}:setSetting`, key, value)
  },
  audio: {
    analyzeReplayGain: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.audio}:analyzeReplayGain`, trackId)
  },
  lyrics: {
    getLyrics: (trackId) => ipcRenderer.invoke(`${IPC_CHANNELS.lyrics}:getLyrics`, trackId)
  }
};

contextBridge.exposeInMainWorld("aural", bridge);
