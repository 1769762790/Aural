import type { AuralDatabase } from "./store";
import { buildSearchBlob } from "./helpers";
import {
  getAlbumDetail as getAlbumDetailRecord,
  listAlbums as listAlbumsRecord
} from "./repositories/album.repository";
import {
  ensureLibrarySummaries as ensureLibrarySummariesRecord,
  getArtistDetail as getArtistDetailRecord,
  listArtists as listArtistsRecord,
  refreshLibrarySummaries as refreshLibrarySummariesRecord
} from "./repositories/artist.repository";
import {
  deactivateMissingScanFolders as deactivateMissingScanFoldersRecord,
  listFolders as listFoldersRecord,
  listScanFolders as listScanFoldersRecord,
  markScanFoldersScanned as markScanFoldersScannedRecord,
  removeScanFolder as removeScanFolderRecord,
  upsertScanFolders as upsertScanFoldersRecord
} from "./repositories/folder.repository";
import {
  clearPlayHistory as clearPlayHistoryRecord,
  getRecentHistory as getRecentHistoryRecord,
  prunePlayHistory as prunePlayHistoryRecord,
  recordPlay as recordPlayRecord
} from "./repositories/history.repository";
import {
  addToPlaylist as addToPlaylistRecord,
  createPlaylist as createPlaylistRecord,
  deletePlaylist as deletePlaylistRecord,
  getPlaylist as getPlaylistRecord,
  listPlaylists as listPlaylistsRecord,
  removeFromPlaylist as removeFromPlaylistRecord,
  renamePlaylist as renamePlaylistRecord,
  searchPlaylists as searchPlaylistsRecord
} from "./repositories/playlist.repository";
import {
  getAllSettings as getAllSettingsRecord,
  getSetting as getSettingRecord,
  searchAlbums as searchAlbumsRecord,
  searchArtists as searchArtistsRecord,
  setSetting as setSettingRecord
} from "./repositories/settings.repository";
import {
  deleteTrackById as deleteTrackByIdRecord,
  findTrackById as findTrackByIdRecord,
  findTrackByPath as findTrackByPathRecord,
  findTrackMediaById as findTrackMediaByIdRecord,
  findTracksByHash as findTracksByHashRecord,
  getFavorites as getFavoritesRecord,
  getOverview as getOverviewRecord,
  listTracks as listTracksRecord,
  markTracksMissing as markTracksMissingRecord,
  searchTracks as searchTracksRecord,
  toggleFavorite as toggleFavoriteRecord,
  upsertTrack as upsertTrackRecord,
  upsertTracks as upsertTracksRecord
} from "./repositories/track.repository";
export type {
  AlbumListQuery,
  ArtistListQuery,
  CreatePlaylistInput,
  FolderListQuery,
  PlaylistMutationInput,
  ScanFolderRecord,
  SearchTrackQuery,
  SettingRecord,
  TrackListQuery,
  TrackMediaRecord,
  TrackRecordInput
} from "./repositories/types";
import type {
  AlbumDetail,
  AlbumListQuery,
  AlbumSummary,
  ArtistDetail,
  ArtistListQuery,
  ArtistSummary,
  CreatePlaylistInput,
  FolderListQuery,
  FolderSummary,
  PlaylistId,
  PlaylistMutationInput,
  PlaylistSummary,
  ScanFolderRecord,
  SearchTrackQuery,
  SettingKey,
  SettingRecord,
  SettingValue,
  Track,
  TrackId,
  TrackListQuery,
  TrackMediaRecord,
  TrackRecordInput
} from "./repositories/types";

export class AuralRepository {
  constructor(private readonly database: AuralDatabase) {}

  refreshLibrarySummaries(updatedAt?: string): void {
    refreshLibrarySummariesRecord(this.database, updatedAt);
  }

  ensureLibrarySummaries(): void {
    ensureLibrarySummariesRecord(this.database, () => this.refreshLibrarySummaries());
  }

  upsertTrack(input: TrackRecordInput): Track {
    return upsertTrackRecord(this.database, input, {
      refreshLibrarySummaries: () => this.refreshLibrarySummaries(),
      findTrackById: (id) => this.findTrackById(id),
      findTrackByPath: (path) => this.findTrackByPath(path),
      listTracks: (query) => this.listTracks(query)
    });
  }

  upsertTracks(inputs: TrackRecordInput[]) {
    return upsertTracksRecord(this.database, inputs, (input) => this.upsertTrack(input));
  }

  findTrackById(id: TrackId | string): Track | null {
    return findTrackByIdRecord(this.database, id);
  }

  findTrackByPath(path: string): Track | null {
    return findTrackByPathRecord(this.database, path);
  }

  findTracksByHash(fileHash: string): Track[] {
    return findTracksByHashRecord(this.database, fileHash);
  }

  findTrackMediaById(id: TrackId | string): TrackMediaRecord | null {
    return findTrackMediaByIdRecord(this.database, id);
  }

  markTracksMissing(trackIds: TrackId[]): number {
    return markTracksMissingRecord(this.database, trackIds);
  }

  deleteTrackById(trackId: TrackId): Track | null {
    return deleteTrackByIdRecord(this.database, trackId, {
      findTrackById: (id) => this.findTrackById(id),
      refreshLibrarySummaries: () => this.refreshLibrarySummaries()
    });
  }

  listTracks(query: TrackListQuery = {}): Track[] {
    return listTracksRecord(this.database, query);
  }

  getArtistDetail(artistId: string): ArtistDetail | null {
    return getArtistDetailRecord(this.database, artistId);
  }

  listArtists(query: ArtistListQuery = {}): ArtistSummary[] {
    return listArtistsRecord(this.database, query);
  }

  getAlbumDetail(albumId: string): AlbumDetail | null {
    return getAlbumDetailRecord(this.database, albumId);
  }

  listAlbums(query: AlbumListQuery = {}): AlbumSummary[] {
    return listAlbumsRecord(this.database, query);
  }

  listFolders(query: FolderListQuery = {}): FolderSummary[] {
    return listFoldersRecord(this.database, query);
  }

  getOverview() {
    return getOverviewRecord(this.database);
  }

  createPlaylist(input: CreatePlaylistInput): PlaylistSummary {
    return createPlaylistRecord(this.database, input, (playlistId) => this.getPlaylist(playlistId));
  }

  renamePlaylist(playlistId: PlaylistId, name: string): PlaylistSummary | null {
    return renamePlaylistRecord(this.database, playlistId, name, (id) => this.getPlaylist(id));
  }

  deletePlaylist(playlistId: PlaylistId): boolean {
    return deletePlaylistRecord(this.database, playlistId);
  }

  listPlaylists(): PlaylistSummary[] {
    return listPlaylistsRecord(this.database);
  }

  getPlaylist(playlistId: PlaylistId): (PlaylistSummary & { tracks: Track[] }) | null {
    return getPlaylistRecord(this.database, playlistId, (trackId) => this.findTrackById(trackId));
  }

  addToPlaylist(input: PlaylistMutationInput): (PlaylistSummary & { tracks: Track[] }) | null {
    return addToPlaylistRecord(this.database, input, (playlistId) => this.getPlaylist(playlistId));
  }

  removeFromPlaylist(input: PlaylistMutationInput): (PlaylistSummary & { tracks: Track[] }) | null {
    return removeFromPlaylistRecord(this.database, input, (playlistId) => this.getPlaylist(playlistId));
  }

  toggleFavorite(trackId: TrackId): boolean {
    return toggleFavoriteRecord(this.database, trackId, (id) => this.findTrackById(id));
  }

  getFavorites(): Track[] {
    return getFavoritesRecord((query) => this.listTracks(query));
  }

  recordPlay(trackId: TrackId, sourceType = "library", sourceId = "library"): void {
    recordPlayRecord(this.database, trackId, sourceType, sourceId);
  }

  getRecentHistory(limit = 20): Track[] {
    return getRecentHistoryRecord(this.database, limit);
  }

  prunePlayHistory(maxItems: number): number {
    return prunePlayHistoryRecord(this.database, maxItems, () => this.clearPlayHistory());
  }

  clearPlayHistory(): number {
    return clearPlayHistoryRecord(this.database);
  }

  listScanFolders(): ScanFolderRecord[] {
    return listScanFoldersRecord(this.database);
  }

  upsertScanFolders(paths: string[]): ScanFolderRecord[] {
    return upsertScanFoldersRecord(this.database, paths, () => this.listScanFolders());
  }

  markScanFoldersScanned(paths: string[], scannedAt?: string): void {
    markScanFoldersScannedRecord(this.database, paths, scannedAt);
  }

  deactivateMissingScanFolders(activePaths: string[]): number {
    return deactivateMissingScanFoldersRecord(this.database, activePaths);
  }

  removeScanFolder(path: string): {
    folder: string;
    removedFromScanList: boolean;
    removedTracks: number;
    activeFolders: string[];
  } {
    return removeScanFolderRecord(this.database, path, () => this.refreshLibrarySummaries());
  }

  setSetting(key: SettingKey, value: SettingValue): SettingRecord {
    return setSettingRecord(this.database, key, value);
  }

  getSetting(key: SettingKey): SettingRecord | null {
    return getSettingRecord(this.database, key);
  }

  getAllSettings(): SettingRecord[] {
    return getAllSettingsRecord(this.database);
  }

  searchTracks(term: string, limit = 50): Track[] {
    return searchTracksRecord((query) => this.listTracks(query), term, limit);
  }

  searchArtists(term: string): ArtistSummary[] {
    return searchArtistsRecord(() => this.listArtists(), term);
  }

  searchAlbums(term: string): AlbumSummary[] {
    return searchAlbumsRecord(() => this.listAlbums(), term);
  }

  searchPlaylists(term: string): PlaylistSummary[] {
    return searchPlaylistsRecord(() => this.listPlaylists(), buildSearchBlob, term);
  }
}
