import type {
  AlbumDetail,
  AlbumSummary,
  ArtistDetail,
  ArtistSummary,
  PlayableArtistDetail,
  BrowseMode,
  PlaybackAsset,
  PlayableItem,
  FolderSummary,
  OnlineProviderId,
  PlaylistSummary,
  SearchScope,
  SearchTrackHit,
  SettingKey,
  SettingValue,
  SortDirection,
  Track,
  TrackId
} from "@aural/domain";

export const IPC_CHANNELS = {
  system: "aural:system",
  library: "aural:library",
  search: "aural:search",
  collection: "aural:collection",
  online: "aural:online",
  audio: "aural:audio",
  settings: "aural:settings",
  lyrics: "aural:lyrics"
} as const;

export type IpcSource = "app" | "scan" | "user" | "rehydration";

export interface EventEnvelope<TPayload> {
  entity_id: string;
  entity_type: string;
  source: IpcSource;
  timestamp: string;
  payload: TPayload;
}

export interface ImportFoldersResult {
  scanRunId: string;
  folders: string[];
  scannedFiles: number;
  importedTracks: number;
  invalidFiles: number;
}

export interface RemoveFolderResult {
  folder: string;
  removedFromScanList: boolean;
  removedTracks: number;
  activeFolders: string[];
}

export interface DeleteTrackResult {
  trackId: TrackId;
  path: string;
  removedFromLibrary: boolean;
}

export interface UpdateTrackMetadataInput {
  trackId: TrackId;
  title: string;
  artist: string;
  album: string;
  genre: string | null;
  year: number | null;
}

export interface LibraryOverview {
  tracks: number;
  albums: number;
  artists: number;
  playlists: number;
  totalDurationSeconds: number;
}

export interface TrackListQuery {
  search?: string;
  sortBy?: "title" | "artist" | "album" | "addedAt" | "lastPlayedAt" | "duration";
  sortDirection?: SortDirection;
  limit?: number;
}

export interface AlbumListQuery {
  sortBy?: "title" | "artist" | "year" | "addedAt";
  sortDirection?: SortDirection;
}

export interface ArtistListQuery {
  sortBy?: "name" | "trackCount" | "albumCount";
  sortDirection?: SortDirection;
}

export interface OnlineArtistListQuery {
  area?: number;
  type?: number;
  initial?: string | number;
  offset?: number;
  limit?: number;
}

export interface OnlinePlaylistRecommendation {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  trackCount: number;
}

export interface OnlinePlaylistCategory {
  name: string;
  group: string | null;
  hot: boolean;
}

export interface OnlineAlbumListQuery {
  area?: "ALL" | "ZH" | "EA" | "KR" | "JP";
  offset?: number;
  limit?: number;
}

export interface OnlineAlbumSummary {
  id: string;
  title: string;
  artist: string;
  subtitle: string;
  coverUrl: string | null;
  publishTime: string | null;
  year: number | null;
}

export interface OnlineAlbumDetail {
  id: string;
  title: string;
  artist: string;
  description: string;
  coverUrl: string | null;
  publishTime: string | null;
  year: number | null;
  company: string | null;
  items: PlayableItem[];
  trackCount: number;
  totalDurationSeconds: number;
}

export interface OnlineChartPreviewEntry {
  rank: number;
  title: string;
  artist: string;
}

export interface OnlineChartSummary {
  id: string;
  title: string;
  badge: string;
  subtitle: string;
  coverUrl: string | null;
  updateFrequency: string | null;
  trackCount: number;
  preview: OnlineChartPreviewEntry[];
}

export interface OnlineChartsOverview {
  core: OnlineChartSummary[];
  genre: OnlineChartSummary[];
  total: number;
}

export interface OnlinePlaylistDetail {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  items: PlayableItem[];
  trackCount: number;
  totalDurationSeconds: number;
  updatedAt: string | null;
}

export interface FolderListQuery {
  sortBy?: "path" | "trackCount";
  sortDirection?: SortDirection;
}

export interface SearchQuery {
  term: string;
  scope?: SearchScope;
  limit?: number;
}

export interface SearchResults {
  term: string;
  tracks: SearchTrackHit[];
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  playlists: PlaylistSummary[];
}

export interface PlaylistDetail extends PlaylistSummary {
  items: PlayableItem[];
}

export interface CreatePlaylistInput {
  name: string;
}

export interface PlaylistMutationInput {
  playlistId: string;
  itemIds: string[];
}

export interface SettingRecord {
  key: SettingKey;
  value: SettingValue;
}

export interface BeforeQuitFlushListener {
  (): void | Promise<void>;
}

export interface LyricsResponse {
  trackId: string;
  source: "lrc" | "embedded" | "remote" | "none";
  lines: Array<{
    at: number;
    text: string;
    segments?: Array<{
      text: string;
      startMs: number;
      endMs: number;
    }>;
  }>;
}

export interface ReplayGainAnalysis {
  gainDb: number;
  peak: number | null;
  recommendedMultiplier: number;
  unclampedMultiplier: number;
}

export interface OnlineSearchQuery {
  term: string;
  page?: number;
  limit?: number;
}

export interface DownloadedAssetRecord {
  itemId: string;
  provider: OnlineProviderId;
  providerItemId: string;
  localPath: string;
  status: "ready" | "failed" | "pending";
  downloadedAt: string | null;
}

export interface SystemApi {
  chooseFolders(): Promise<string[]>;
  openPath(path: string): Promise<void>;
  setTitleBarTheme(theme: "light" | "dark"): Promise<void>;
  onBeforeQuitFlush(listener: BeforeQuitFlushListener): () => void;
}

export interface LibraryApi {
  importFolders(paths: string[]): Promise<ImportFoldersResult>;
  rescanFolders(): Promise<ImportFoldersResult>;
  removeFolder(path: string): Promise<RemoveFolderResult>;
  deleteTrackFromDevice(trackId: TrackId): Promise<DeleteTrackResult | null>;
  updateTrackMetadata(input: UpdateTrackMetadataInput): Promise<Track | null>;
  getOverview(): Promise<LibraryOverview>;
  listTracks(query?: TrackListQuery): Promise<Track[]>;
  getArtistDetail(artistId: string): Promise<ArtistDetail | null>;
  getAlbumDetail(albumId: string): Promise<AlbumDetail | null>;
  listArtists(query?: ArtistListQuery): Promise<ArtistSummary[]>;
  listAlbums(query?: AlbumListQuery): Promise<AlbumSummary[]>;
  listFolders(query?: FolderListQuery): Promise<FolderSummary[]>;
}

export interface SearchApi {
  searchTracks(query: SearchQuery): Promise<SearchTrackHit[]>;
  searchArtists(query: SearchQuery): Promise<ArtistSummary[]>;
  searchAlbums(query: SearchQuery): Promise<AlbumSummary[]>;
  searchPlaylists(query: SearchQuery): Promise<PlaylistSummary[]>;
  searchAll(query: SearchQuery): Promise<SearchResults>;
}

export interface CollectionApi {
  listPlaylists(): Promise<PlaylistSummary[]>;
  getPlaylist(playlistId: string): Promise<PlaylistDetail | null>;
  createPlaylist(input: CreatePlaylistInput): Promise<PlaylistSummary>;
  renamePlaylist(playlistId: string, name: string): Promise<PlaylistSummary | null>;
  deletePlaylist(playlistId: string): Promise<boolean>;
  addToPlaylist(input: PlaylistMutationInput): Promise<PlaylistDetail | null>;
  removeFromPlaylist(input: PlaylistMutationInput): Promise<PlaylistDetail | null>;
  toggleFavorite(itemId: string): Promise<boolean>;
  getFavorites(mode?: BrowseMode | "all"): Promise<PlayableItem[]>;
  getRecentHistory(limit?: number, mode?: BrowseMode | "all"): Promise<PlayableItem[]>;
  recordPlay(itemId: string, sourceType?: string, sourceId?: string): Promise<void>;
}

export interface SettingsApi {
  getAll(): Promise<SettingRecord[]>;
  getSetting(key: SettingKey): Promise<SettingValue | null>;
  setSetting(key: SettingKey, value: SettingValue): Promise<SettingRecord>;
  setManySettings(records: SettingRecord[]): Promise<SettingRecord[]>;
}

export interface AudioApi {
  analyzeReplayGain(trackId: TrackId): Promise<ReplayGainAnalysis | null>;
}

export interface LyricsApi {
  getLyrics(trackId: string): Promise<LyricsResponse>;
}

export interface OnlineApi {
  searchTracks(query: OnlineSearchQuery): Promise<PlayableItem[]>;
  listArtists(query?: OnlineArtistListQuery): Promise<ArtistSummary[]>;
  getArtistDetail(artistId: string): Promise<PlayableArtistDetail | null>;
  listAlbums(query?: OnlineAlbumListQuery): Promise<OnlineAlbumSummary[]>;
  getAlbumDetail(albumId: string): Promise<OnlineAlbumDetail | null>;
  getChartsOverview(): Promise<OnlineChartsOverview>;
  getDailyRecommendedPlaylists(): Promise<OnlinePlaylistRecommendation[]>;
  getHighqualityPlaylists(limit?: number): Promise<OnlinePlaylistRecommendation[]>;
  getPlaylistCategories(): Promise<OnlinePlaylistCategory[]>;
  getPlaylistsByCategory(category: string, limit?: number): Promise<OnlinePlaylistRecommendation[]>;
  getRecommendedPlaylists(limit?: number): Promise<OnlinePlaylistRecommendation[]>;
  getPlaylistDetail(playlistId: string): Promise<OnlinePlaylistDetail | null>;
  getTrack(itemId: string): Promise<PlayableItem | null>;
  resolvePlayback(itemId: string): Promise<PlaybackAsset | null>;
  getLyrics(itemId: string): Promise<LyricsResponse>;
  download(itemId: string): Promise<DownloadedAssetRecord | null>;
  listDownloads(): Promise<DownloadedAssetRecord[]>;
  getDefaultDownloadDirectory(): Promise<string>;
}

export interface AuralBridge {
  system: SystemApi;
  library: LibraryApi;
  search: SearchApi;
  collection: CollectionApi;
  online: OnlineApi;
  audio: AudioApi;
  settings: SettingsApi;
  lyrics: LyricsApi;
}
