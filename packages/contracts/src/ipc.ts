import type {
  AlbumDetail,
  AlbumSummary,
  ArtistDetail,
  ArtistSummary,
  FolderSummary,
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
  tracks: Track[];
}

export interface CreatePlaylistInput {
  name: string;
}

export interface PlaylistMutationInput {
  playlistId: string;
  trackIds: TrackId[];
}

export interface SettingRecord {
  key: SettingKey;
  value: SettingValue;
}

export interface LyricsResponse {
  trackId: TrackId;
  source: "lrc" | "embedded" | "none";
  lines: Array<{
    at: number;
    text: string;
  }>;
}

export interface ReplayGainAnalysis {
  gainDb: number;
  peak: number | null;
  recommendedMultiplier: number;
  unclampedMultiplier: number;
}

export interface SystemApi {
  chooseFolders(): Promise<string[]>;
  openPath(path: string): Promise<void>;
  setTitleBarTheme(theme: "light" | "dark"): Promise<void>;
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
  toggleFavorite(trackId: TrackId): Promise<boolean>;
  getFavorites(): Promise<Track[]>;
  getRecentHistory(limit?: number): Promise<Track[]>;
  recordPlay(trackId: TrackId): Promise<void>;
}

export interface SettingsApi {
  getAll(): Promise<SettingRecord[]>;
  getSetting(key: SettingKey): Promise<SettingValue | null>;
  setSetting(key: SettingKey, value: SettingValue): Promise<SettingRecord>;
}

export interface AudioApi {
  analyzeReplayGain(trackId: TrackId): Promise<ReplayGainAnalysis | null>;
}

export interface LyricsApi {
  getLyrics(trackId: TrackId): Promise<LyricsResponse>;
}

export interface AuralBridge {
  system: SystemApi;
  library: LibraryApi;
  search: SearchApi;
  collection: CollectionApi;
  audio: AudioApi;
  settings: SettingsApi;
  lyrics: LyricsApi;
}
