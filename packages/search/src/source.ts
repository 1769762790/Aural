import type {
  AlbumSummary,
  ArtistSummary,
  PlaylistSummary,
  SortDirection,
  Track,
  TrackStatus
} from "@aural/domain/entities";

export interface SearchTextIndex {
  searchText?: string | null;
  pinyin?: string | null;
  pinyinInitials?: string | null;
}

export interface SearchTrackRecord extends Track, SearchTextIndex {}

export interface SearchArtistRecord extends ArtistSummary, SearchTextIndex {}

export interface SearchAlbumRecord extends AlbumSummary, SearchTextIndex {}

export interface SearchPlaylistRecord extends PlaylistSummary, SearchTextIndex {}

export interface SearchSource {
  listTracks(): Promise<SearchTrackRecord[]>;
  listArtists(): Promise<SearchArtistRecord[]>;
  listAlbums(): Promise<SearchAlbumRecord[]>;
  listPlaylists(): Promise<SearchPlaylistRecord[]>;
}

export interface ArraySearchSourceInput {
  tracks?: SearchTrackRecord[];
  artists?: SearchArtistRecord[];
  albums?: SearchAlbumRecord[];
  playlists?: SearchPlaylistRecord[];
}

export const createArraySearchSource = (input: ArraySearchSourceInput): SearchSource => ({
  async listTracks() {
    return input.tracks ?? [];
  },
  async listArtists() {
    return input.artists ?? [];
  },
  async listAlbums() {
    return input.albums ?? [];
  },
  async listPlaylists() {
    return input.playlists ?? [];
  }
});

export interface SearchSortState {
  sortBy?: string;
  sortDirection?: SortDirection;
}

export const buildSearchText = (values: Array<string | null | undefined>) =>
  values.filter((value): value is string => Boolean(value)).join(" ");

export const isReadyTrack = (status: TrackStatus) => status === "ready";
