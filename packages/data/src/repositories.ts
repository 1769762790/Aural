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
  createPlaylist as createPlaylistRecord,
  deletePlaylist as deletePlaylistRecord,
  renamePlaylist as renamePlaylistRecord,
  searchPlaylists as searchPlaylistsRecord
} from "./repositories/playlist.repository";
import {
  addPlayableItemsToPlaylist as addPlayableItemsToPlaylistRecord,
  clearPlayableHistory as clearPlayableHistoryRecord,
  findPlayableItemById as findPlayableItemByIdRecord,
  findPlayableItemByProvider as findPlayableItemByProviderRecord,
  getDownloadedAsset as getDownloadedAssetRecord,
  getOnlineArtistDetail as getOnlineArtistDetailRecord,
  getPlaylistWithPlayableItems as getPlaylistWithPlayableItemsRecord,
  getRecentPlayableHistory as getRecentPlayableHistoryRecord,
  listDownloadedAssets as listDownloadedAssetsRecord,
  listFavoriteItems as listFavoriteItemsRecord,
  listOnlineArtists as listOnlineArtistsRecord,
  listPlaylistsWithPlayableItems as listPlaylistsWithPlayableItemsRecord,
  listPlayableItemsByIds as listPlayableItemsByIdsRecord,
  prunePlayableHistory as prunePlayableHistoryRecord,
  recordPlayableItemPlay as recordPlayableItemPlayRecord,
  removePlayableItem as removePlayableItemRecord,
  removePlayableItemsFromPlaylist as removePlayableItemsFromPlaylistRecord,
  syncLocalTrackToPlayableItem as syncLocalTrackToPlayableItemRecord,
  toggleFavoriteItem as toggleFavoriteItemRecord,
  upsertDownloadedAsset as upsertDownloadedAssetRecord,
  upsertPlayableItem as upsertPlayableItemRecord
} from "./repositories/playable.repository";
import {
  getAllSettings as getAllSettingsRecord,
  getSetting as getSettingRecord,
  searchAlbums as searchAlbumsRecord,
  searchArtists as searchArtistsRecord,
  setManySettings as setManySettingsRecord,
  setSetting as setSettingRecord
} from "./repositories/settings.repository";
import {
  deleteTrackById as deleteTrackByIdRecord,
  findTrackById as findTrackByIdRecord,
  findTrackByPath as findTrackByPathRecord,
  findTrackMediaById as findTrackMediaByIdRecord,
  findTracksByHash as findTracksByHashRecord,
  getOverview as getOverviewRecord,
  listTracks as listTracksRecord,
  markTracksMissing as markTracksMissingRecord,
  searchTracks as searchTracksRecord,
  upsertTrack as upsertTrackRecord,
  upsertTracks as upsertTracksRecord
} from "./repositories/track.repository";
export type {
  AlbumListQuery,
  ArtistListQuery,
  CreatePlaylistInput,
  DownloadedAssetRow,
  FolderListQuery,
  PlayableItemRecordInput,
  PlaylistMutationInput,
  PlayableItemRow,
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
  PlayableArtistDetail,
  CreatePlaylistInput,
  DownloadedAssetRow,
  FolderListQuery,
  FolderSummary,
  PlayableItem,
  PlayableItemRecordInput,
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
    const track = upsertTrackRecord(this.database, input, {
      refreshLibrarySummaries: () => this.refreshLibrarySummaries(),
      findTrackById: (id) => this.findTrackById(id),
      findTrackByPath: (path) => this.findTrackByPath(path),
      listTracks: (query) => this.listTracks(query)
    });
    syncLocalTrackToPlayableItemRecord(this.database, track);
    return track;
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
    const deleted = deleteTrackByIdRecord(this.database, trackId, {
      findTrackById: (id) => this.findTrackById(id),
      refreshLibrarySummaries: () => this.refreshLibrarySummaries()
    });
    if (deleted) {
      removePlayableItemRecord(this.database, deleted.id);
    }
    return deleted;
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

  listOnlineArtists(query: ArtistListQuery = {}): ArtistSummary[] {
    return listOnlineArtistsRecord(this.database, query);
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
    return listPlaylistsWithPlayableItemsRecord(this.database);
  }

  getPlaylist(playlistId: PlaylistId): (PlaylistSummary & { items: PlayableItem[] }) | null {
    return getPlaylistWithPlayableItemsRecord(this.database, playlistId);
  }

  addToPlaylist(input: PlaylistMutationInput): (PlaylistSummary & { items: PlayableItem[] }) | null {
    return addPlayableItemsToPlaylistRecord(this.database, input);
  }

  removeFromPlaylist(input: PlaylistMutationInput): (PlaylistSummary & { items: PlayableItem[] }) | null {
    return removePlayableItemsFromPlaylistRecord(this.database, input);
  }

  toggleFavorite(itemId: string): boolean {
    return toggleFavoriteItemRecord(this.database, itemId);
  }

  getFavorites(mode: "local" | "online" | "all" = "all"): PlayableItem[] {
    return listFavoriteItemsRecord(this.database, mode);
  }

  getOnlineArtistDetail(artistId: string): PlayableArtistDetail | null {
    return getOnlineArtistDetailRecord(this.database, artistId);
  }

  recordPlay(itemId: string, sourceType = "library", sourceId = "library"): void {
    recordPlayableItemPlayRecord(this.database, itemId, sourceType, sourceId);
  }

  getRecentHistory(limit = 20, mode: "local" | "online" | "all" = "all"): PlayableItem[] {
    return getRecentPlayableHistoryRecord(this.database, limit, mode);
  }

  prunePlayHistory(maxItems: number): number {
    return prunePlayableHistoryRecord(this.database, maxItems);
  }

  clearPlayHistory(): number {
    return clearPlayableHistoryRecord(this.database);
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

  setManySettings(records: Array<{ key: SettingKey; value: SettingValue }>): SettingRecord[] {
    return setManySettingsRecord(this.database, records);
  }

  getSetting(key: SettingKey): SettingRecord | null {
    return getSettingRecord(this.database, key);
  }

  getAllSettings(): SettingRecord[] {
    return getAllSettingsRecord(this.database);
  }

  upsertPlayableItem(input: PlayableItemRecordInput): PlayableItem {
    return upsertPlayableItemRecord(this.database, input);
  }

  findPlayableItemById(itemId: string): PlayableItem | null {
    return findPlayableItemByIdRecord(this.database, itemId);
  }

  findPlayableItemByProvider(provider: string, providerItemId: string): PlayableItem | null {
    return findPlayableItemByProviderRecord(this.database, provider, providerItemId);
  }

  listPlayableItemsByIds(itemIds: string[]): PlayableItem[] {
    return listPlayableItemsByIdsRecord(this.database, itemIds);
  }

  getDownloadedAsset(itemId: string): DownloadedAssetRow | null {
    return getDownloadedAssetRecord(this.database, itemId);
  }

  upsertDownloadedAsset(row: DownloadedAssetRow): DownloadedAssetRow {
    return upsertDownloadedAssetRecord(this.database, row);
  }

  listDownloadedAssets(): DownloadedAssetRow[] {
    return listDownloadedAssetsRecord(this.database);
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
