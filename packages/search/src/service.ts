import type {
  AlbumSummary,
  ArtistSummary,
  PlaylistSummary,
  SearchScope,
  SearchTrackHit,
  SortDirection
} from "@aural/domain/entities";
import { normalizeSearchTerm } from "@aural/domain/search";
import { scoreCandidate, type MatchReason, type SearchCandidateForms } from "./ranking";
import type {
  SearchAlbumRecord,
  SearchArtistRecord,
  SearchPlaylistRecord,
  SearchSource,
  SearchTrackRecord
} from "./source";

export type TrackSearchSortBy = "relevance" | "title" | "artist" | "album" | "addedAt" | "playCount" | "duration";
export type ArtistSearchSortBy = "relevance" | "name" | "trackCount" | "albumCount";
export type AlbumSearchSortBy = "relevance" | "title" | "artist" | "year" | "trackCount";
export type PlaylistSearchSortBy = "relevance" | "name" | "trackCount" | "updatedAt";
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

interface RankedRecord<TRecord> {
  record: TRecord;
  matchRank: number;
  reason: MatchReason;
  sortKey: string;
}

const defaultDirection = (direction?: SortDirection) => direction ?? "asc";

const compareString = (left: string, right: string, direction: SortDirection) =>
  left.localeCompare(right, "zh-Hans-CN", { sensitivity: "base" }) * (direction === "asc" ? 1 : -1);

const compareNumber = (left: number, right: number, direction: SortDirection) =>
  (left - right) * (direction === "asc" ? 1 : -1);

const compareDate = (left: string | null, right: string | null, direction: SortDirection) => {
  const leftTime = left ? Date.parse(left) : 0;
  const rightTime = right ? Date.parse(right) : 0;
  return compareNumber(leftTime, rightTime, direction);
};

const compareByRelevance = <TRecord>(left: RankedRecord<TRecord>, right: RankedRecord<TRecord>, direction: SortDirection) => {
  const rankDelta = compareNumber(left.matchRank, right.matchRank, "desc");
  if (rankDelta !== 0) {
    return rankDelta;
  }

  return compareString(left.sortKey, right.sortKey, direction);
};

const limitResults = <T>(results: T[], limit?: number) =>
  typeof limit === "number" && limit >= 0 ? results.slice(0, limit) : results;

const isQueryBlank = (term: string) => !normalizeSearchTerm(term);

const rankRecords = <TRecord>(
  records: TRecord[],
  request: SearchRequest,
  candidateFor: (record: TRecord) => SearchCandidateForms,
  sortKeyFor: (record: TRecord) => string
) =>
  records
    .map((record) => {
      const score = scoreCandidate(candidateFor(record), request.term);
      if (!score) {
        return null;
      }

      return {
        record,
        reason: score.reason,
        matchRank: toMatchRank(score.reason),
        sortKey: sortKeyFor(record)
      } as RankedRecord<TRecord>;
    })
    .filter((value): value is RankedRecord<TRecord> => value !== null);

const toMatchRank = (reason: MatchReason) => {
  switch (reason) {
    case "exact":
      return 1000;
    case "pinyin":
      return 960;
    case "prefix":
      return 920;
    case "initials":
      return 880;
    case "fuzzy":
      return 760;
  }
};

const trackCandidate = (record: SearchTrackRecord): SearchCandidateForms => ({
  texts: [record.title, record.artist, record.album, record.albumArtist, record.directory, record.searchText ?? null].filter(
    Boolean
  ) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

const artistCandidate = (record: SearchArtistRecord): SearchCandidateForms => ({
  texts: [record.name, record.searchText ?? record.normalizedName].filter(Boolean) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

const albumCandidate = (record: SearchAlbumRecord): SearchCandidateForms => ({
  texts: [record.title, record.artist, record.searchText ?? null].filter(Boolean) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

const playlistCandidate = (record: SearchPlaylistRecord): SearchCandidateForms => ({
  texts: [record.name, record.searchText ?? null].filter(Boolean) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

const trackSortKey = (record: SearchTrackRecord) => record.title || record.path;
const artistSortKey = (record: SearchArtistRecord) => record.name;
const albumSortKey = (record: SearchAlbumRecord) => record.title;
const playlistSortKey = (record: SearchPlaylistRecord) => record.name;

const compareTrackSort = (
  left: RankedRecord<SearchTrackRecord>,
  right: RankedRecord<SearchTrackRecord>,
  sortBy: TrackSearchSortBy,
  direction: SortDirection
) => {
  switch (sortBy) {
    case "title":
      return compareString(left.record.title, right.record.title, direction);
    case "artist":
      return compareString(left.record.artist, right.record.artist, direction);
    case "album":
      return compareString(left.record.album, right.record.album, direction);
    case "addedAt":
      return compareDate(left.record.addedAt, right.record.addedAt, direction);
    case "playCount":
      return compareNumber(left.record.playCount, right.record.playCount, direction);
    case "duration":
      return compareNumber(left.record.duration, right.record.duration, direction);
    case "relevance":
      return compareByRelevance(left, right, direction);
  }
};

const compareArtistSort = (
  left: RankedRecord<SearchArtistRecord>,
  right: RankedRecord<SearchArtistRecord>,
  sortBy: ArtistSearchSortBy,
  direction: SortDirection
) => {
  switch (sortBy) {
    case "name":
      return compareString(left.record.name, right.record.name, direction);
    case "trackCount":
      return compareNumber(left.record.trackCount, right.record.trackCount, direction);
    case "albumCount":
      return compareNumber(left.record.albumCount, right.record.albumCount, direction);
    case "relevance":
      return compareByRelevance(left, right, direction);
  }
};

const compareAlbumSort = (
  left: RankedRecord<SearchAlbumRecord>,
  right: RankedRecord<SearchAlbumRecord>,
  sortBy: AlbumSearchSortBy,
  direction: SortDirection
) => {
  switch (sortBy) {
    case "title":
      return compareString(left.record.title, right.record.title, direction);
    case "artist":
      return compareString(left.record.artist, right.record.artist, direction);
    case "year":
      return compareNumber(left.record.year ?? 0, right.record.year ?? 0, direction);
    case "trackCount":
      return compareNumber(left.record.trackCount, right.record.trackCount, direction);
    case "relevance":
      return compareByRelevance(left, right, direction);
  }
};

const comparePlaylistSort = (
  left: RankedRecord<SearchPlaylistRecord>,
  right: RankedRecord<SearchPlaylistRecord>,
  sortBy: PlaylistSearchSortBy,
  direction: SortDirection
) => {
  switch (sortBy) {
    case "name":
      return compareString(left.record.name, right.record.name, direction);
    case "trackCount":
      return compareNumber(left.record.trackCount, right.record.trackCount, direction);
    case "updatedAt":
      return compareDate(left.record.updatedAt, right.record.updatedAt, direction);
    case "relevance":
      return compareByRelevance(left, right, direction);
  }
};

export class DefaultSearchService implements SearchService {
  constructor(private readonly source: SearchSource) {}

  async searchTracks(request: SearchRequest): Promise<SearchTrackHit[]> {
    if (isQueryBlank(request.term)) {
      return [];
    }

    const ranked = rankRecords(await this.source.listTracks(), request, trackCandidate, trackSortKey).sort((left, right) => {
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

    const ranked = rankRecords(await this.source.listArtists(), request, artistCandidate, artistSortKey).sort((left, right) => {
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

    const ranked = rankRecords(await this.source.listAlbums(), request, albumCandidate, albumSortKey).sort((left, right) => {
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

    const ranked = rankRecords(await this.source.listPlaylists(), request, playlistCandidate, playlistSortKey).sort((left, right) => {
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

