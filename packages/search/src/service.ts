import type {
  AlbumSummary,
  ArtistSummary,
  PlaylistSummary,
  SearchScope,
  SearchTrackHit,
  SortDirection
} from "@aural/domain";
import {
  compareAlbumSort,
  compareArtistSort,
  compareByRelevance,
  comparePlaylistSort,
  compareTrackSort,
  defaultDirection
} from "./comparators";
import {
  albumCandidate,
  albumSortKey,
  artistCandidate,
  artistSortKey,
  playlistCandidate,
  playlistSortKey,
  trackCandidate,
  trackSortKey
} from "./candidates";
import {
  isQueryBlank,
  limitResults,
  rankRecords,
  type AlbumSearchSortBy,
  type ArtistSearchSortBy,
  type PlaylistSearchSortBy,
  type RankedRecord,
  type TrackSearchSortBy
} from "./ranked-search";
import type {
  SearchAlbumRecord,
  SearchArtistRecord,
  SearchPlaylistRecord,
  SearchSource,
  SearchTrackRecord
} from "./source";
export type SearchSortBy = TrackSearchSortBy | ArtistSearchSortBy | AlbumSearchSortBy | PlaylistSearchSortBy;

export interface SearchRequest {
  term: string;
  scope?: SearchScope;
  limit?: number;
  sortBy?: SearchSortBy;
  sortDirection?: SortDirection;
}

export interface SearchResults {
  term: string;
  tracks: SearchTrackHit[];
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  playlists: PlaylistSummary[];
}

export interface SearchService {
  searchTracks(request: SearchRequest): Promise<SearchTrackHit[]>;
  searchArtists(request: SearchRequest): Promise<ArtistSummary[]>;
  searchAlbums(request: SearchRequest): Promise<AlbumSummary[]>;
  searchPlaylists(request: SearchRequest): Promise<PlaylistSummary[]>;
  searchAll(request: SearchRequest): Promise<SearchResults>;
}

export class DefaultSearchService implements SearchService {
  constructor(private readonly source: SearchSource) {}

  async searchTracks(request: SearchRequest): Promise<SearchTrackHit[]> {
    if (isQueryBlank(request.term)) {
      return [];
    }

    const ranked = rankRecords(await this.source.listTracks(), request.term, trackCandidate, trackSortKey).sort((left, right) => {
      if (request.sortBy && request.sortBy !== "relevance") {
        return compareTrackSort(left, right, request.sortBy as TrackSearchSortBy, defaultDirection(request.sortDirection));
      }

      return compareByRelevance(left, right, defaultDirection(request.sortDirection));
    });

    return limitResults(
      ranked.map(({ record, matchRank, reason }) => ({ ...record, matchRank, reason })),
      request.limit
    );
  }

  async searchArtists(request: SearchRequest): Promise<ArtistSummary[]> {
    if (isQueryBlank(request.term)) {
      return [];
    }

    const ranked = rankRecords(await this.source.listArtists(), request.term, artistCandidate, artistSortKey).sort((left, right) => {
      if (request.sortBy && request.sortBy !== "relevance") {
        return compareArtistSort(left, right, request.sortBy as ArtistSearchSortBy, defaultDirection(request.sortDirection));
      }

      return compareByRelevance(left, right, defaultDirection(request.sortDirection));
    });

    return limitResults(ranked.map(({ record }) => record), request.limit);
  }

  async searchAlbums(request: SearchRequest): Promise<AlbumSummary[]> {
    if (isQueryBlank(request.term)) {
      return [];
    }

    const ranked = rankRecords(await this.source.listAlbums(), request.term, albumCandidate, albumSortKey).sort((left, right) => {
      if (request.sortBy && request.sortBy !== "relevance") {
        return compareAlbumSort(left, right, request.sortBy as AlbumSearchSortBy, defaultDirection(request.sortDirection));
      }

      return compareByRelevance(left, right, defaultDirection(request.sortDirection));
    });

    return limitResults(ranked.map(({ record }) => record), request.limit);
  }

  async searchPlaylists(request: SearchRequest): Promise<PlaylistSummary[]> {
    if (isQueryBlank(request.term)) {
      return [];
    }

    const ranked = rankRecords(await this.source.listPlaylists(), request.term, playlistCandidate, playlistSortKey).sort((left, right) => {
      if (request.sortBy && request.sortBy !== "relevance") {
        return comparePlaylistSort(left, right, request.sortBy as PlaylistSearchSortBy, defaultDirection(request.sortDirection));
      }

      return compareByRelevance(left, right, defaultDirection(request.sortDirection));
    });

    return limitResults(ranked.map(({ record }) => record), request.limit);
  }

  async searchAll(request: SearchRequest): Promise<SearchResults> {
    const scope = request.scope ?? "all";
    const [tracks, artists, albums, playlists] = await Promise.all([
      scope === "all" || scope === "tracks" ? this.searchTracks(request) : Promise.resolve([]),
      scope === "all" || scope === "artists" ? this.searchArtists(request) : Promise.resolve([]),
      scope === "all" || scope === "albums" ? this.searchAlbums(request) : Promise.resolve([]),
      scope === "all" || scope === "playlists" ? this.searchPlaylists(request) : Promise.resolve([])
    ]);

    return {
      term: request.term,
      tracks,
      artists,
      albums,
      playlists
    };
  }
}

export const createSearchService = (source: SearchSource) => new DefaultSearchService(source);
