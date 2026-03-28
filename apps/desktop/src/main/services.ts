import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pinyin } from "pinyin-pro";
import type { AuralBridge } from "@aural/contracts";
import type { PlaylistId } from "@aural/domain";
import { openAuralDatabase, AuralRepository } from "@aural/data";
import type { SearchAlbumRecord, SearchArtistRecord, SearchPlaylistRecord, SearchSource, SearchTrackRecord } from "@aural/search";
import { createSearchService } from "@aural/search";
import { createLibraryService } from "@aural/library";
import { createLyricsSnapshot } from "@aural/player";
import { createMetadataEditor } from "./metadata-editor";
import { createReplayGainService } from "./replaygain";

const buildPinyinForms = (value: string) => {
  const full = pinyin(value, { toneType: "none" }).toLowerCase().trim();
  const initials = full
    .split(/\s+/)
    .map((token) => token[0] ?? "")
    .join("");

  return {
    searchText: value,
    pinyin: full,
    pinyinInitials: initials
  };
};

const createSearchSource = (repository: AuralRepository): SearchSource => ({
  async listTracks(): Promise<SearchTrackRecord[]> {
    return repository.listTracks({ limit: 5000 }).map((track) => ({
      ...track,
      ...buildPinyinForms([track.title, track.artist, track.album, track.directory].join(" "))
    }));
  },
  async listArtists(): Promise<SearchArtistRecord[]> {
    return repository.listArtists().map((artist) => ({
      ...artist,
      ...buildPinyinForms(artist.name)
    }));
  },
  async listAlbums(): Promise<SearchAlbumRecord[]> {
    return repository.listAlbums().map((album) => ({
      ...album,
      ...buildPinyinForms(`${album.title} ${album.artist}`)
    }));
  },
  async listPlaylists(): Promise<SearchPlaylistRecord[]> {
    return repository.listPlaylists().map((playlist) => ({
      ...playlist,
      ...buildPinyinForms(playlist.name)
    }));
  }
});

const asPlaylistId = (playlistId: string) => playlistId as PlaylistId;

export interface AppServices {
  database: ReturnType<typeof openAuralDatabase>;
  bridge: Omit<AuralBridge, "system">;
  beforeQuit: () => void;
}

export const createAppServices = (userDataPath: string): AppServices => {
  const database = openAuralDatabase({
    filePath: path.join(userDataPath, "aural.sqlite")
  });
  const repository = new AuralRepository(database);
  repository.ensureLibrarySummaries();
  const libraryService = createLibraryService({
    repository,
    artworkCacheDir: path.join(userDataPath, "media-cache", "artwork")
  });
  const metadataEditor = createMetadataEditor();
  const replayGainService = createReplayGainService(repository);
  const searchService = createSearchService(createSearchSource(repository));
  const resolveHistoryLimit = () => {
    const configured = Number(repository.getSetting("history.maxItems")?.value ?? 300);
    return Number.isFinite(configured) ? Math.max(0, Math.floor(configured)) : 300;
  };

  return {
    database,
    beforeQuit: () => {
      const clearHistoryOnExit = repository.getSetting("history.clearOnExit")?.value === true;
      if (clearHistoryOnExit) {
        repository.clearPlayHistory();
      }
    },
    bridge: {
      library: {
        importFolders: (paths) => libraryService.importFolders(paths),
        rescanFolders: () => libraryService.rescanFolders(),
        removeFolder: (targetPath) => libraryService.removeFolder(targetPath),
        deleteTrackFromDevice: async (trackId) => {
          const track = repository.findTrackById(trackId);
          if (!track) {
            return null;
          }

          try {
            await rm(track.path, { force: true });
          } catch (error) {
            if (!(error instanceof Error) || !/ENOENT/i.test(error.message)) {
              throw error;
            }
          }

          const removed = repository.deleteTrackById(trackId);
          return removed
            ? {
                trackId: removed.id,
                path: removed.path,
                removedFromLibrary: true
              }
            : null;
        },
        updateTrackMetadata: async (input) => {
          const track = repository.findTrackById(input.trackId);
          if (!track) {
            return null;
          }

          await metadataEditor.updateTrackMetadata(track.path, input);
          return libraryService.syncTrackById(input.trackId);
        },
        getOverview: async () => repository.getOverview(),
        listTracks: async (query) => repository.listTracks(query),
        getArtistDetail: async (artistId) => repository.getArtistDetail(artistId),
        getAlbumDetail: async (albumId) => repository.getAlbumDetail(albumId),
        listArtists: async (query) => repository.listArtists(query),
        listAlbums: async (query) => repository.listAlbums(query),
        listFolders: async (query) => repository.listFolders(query)
      },
      search: {
        searchTracks: (query) => searchService.searchTracks(query),
        searchArtists: (query) => searchService.searchArtists(query),
        searchAlbums: (query) => searchService.searchAlbums(query),
        searchPlaylists: (query) => searchService.searchPlaylists(query),
        searchAll: (query) => searchService.searchAll(query)
      },
      collection: {
        listPlaylists: async () => repository.listPlaylists(),
        getPlaylist: async (playlistId) => repository.getPlaylist(asPlaylistId(playlistId)),
        createPlaylist: async (input) => repository.createPlaylist(input),
        renamePlaylist: async (playlistId, name) => repository.renamePlaylist(asPlaylistId(playlistId), name),
        deletePlaylist: async (playlistId) => repository.deletePlaylist(asPlaylistId(playlistId)),
        addToPlaylist: async (input) => repository.addToPlaylist({ ...input, playlistId: asPlaylistId(input.playlistId) }),
        removeFromPlaylist: async (input) =>
          repository.removeFromPlaylist({ ...input, playlistId: asPlaylistId(input.playlistId) }),
        toggleFavorite: async (trackId) => repository.toggleFavorite(trackId),
        getFavorites: async () => repository.getFavorites(),
        getRecentHistory: async (limit) => repository.getRecentHistory(Math.min(limit ?? resolveHistoryLimit(), resolveHistoryLimit())),
        recordPlay: async (trackId) => {
          repository.recordPlay(trackId);
          repository.prunePlayHistory(resolveHistoryLimit());
        }
      },
      settings: {
        getAll: async () =>
          repository.getAllSettings().map(({ key, value }) => ({
            key,
            value
          })),
        getSetting: async (key) => repository.getSetting(key)?.value ?? null,
        setSetting: async (key, value) => {
          const record = repository.setSetting(key, value);
          if (key === "history.maxItems") {
            const normalized = Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 300;
            repository.prunePlayHistory(normalized);
          }
          return {
            key: record.key,
            value: record.value
          };
        }
      },
      audio: {
        analyzeReplayGain: async (trackId) => replayGainService.analyzeReplayGain(trackId)
      },
      lyrics: {
        getLyrics: async (trackId) => {
          const trackMedia = repository.findTrackMediaById(trackId);
          if (!trackMedia) {
            return {
              trackId,
              source: "none" as const,
              lines: []
            };
          }

          try {
            if (trackMedia.lyricPath) {
              const content = await readFile(trackMedia.lyricPath, "utf8");
              const snapshot = createLyricsSnapshot(trackId as never, content, "lrc");
              return {
                trackId,
                source: snapshot.source,
                lines: snapshot.lines.map((line) => ({
                  at: line.timeMs,
                  text: line.text
                }))
              };
            }

            if (trackMedia.embeddedLyrics) {
              const snapshot = createLyricsSnapshot(trackId as never, trackMedia.embeddedLyrics, "embedded");
              return {
                trackId,
                source: snapshot.source,
                lines: snapshot.lines.map((line) => ({
                  at: line.timeMs,
                  text: line.text
                }))
              };
            }

            return {
              trackId,
              source: "none" as const,
              lines: []
            };
          } catch {
            return {
              trackId,
              source: "none" as const,
              lines: []
            };
          }
        }
      }
    }
  };
};
