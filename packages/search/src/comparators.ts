import type { SortDirection } from "@aural/domain";
import type {
  SearchAlbumRecord,
  SearchArtistRecord,
  SearchPlaylistRecord,
  SearchTrackRecord
} from "./source";
import type {
  AlbumSearchSortBy,
  ArtistSearchSortBy,
  PlaylistSearchSortBy,
  RankedRecord,
  TrackSearchSortBy
} from "./ranked-search";

export const defaultDirection = (direction?: SortDirection) => direction ?? "asc";

const compareString = (left: string, right: string, direction: SortDirection) =>
  left.localeCompare(right, "zh-Hans-CN", { sensitivity: "base" }) * (direction === "asc" ? 1 : -1);

const compareNumber = (left: number, right: number, direction: SortDirection) =>
  (left - right) * (direction === "asc" ? 1 : -1);

const compareDate = (left: string | null, right: string | null, direction: SortDirection) => {
  const leftTime = left ? Date.parse(left) : 0;
  const rightTime = right ? Date.parse(right) : 0;
  return compareNumber(leftTime, rightTime, direction);
};

export const compareByRelevance = <TRecord>(left: RankedRecord<TRecord>, right: RankedRecord<TRecord>, direction: SortDirection) => {
  const rankDelta = compareNumber(left.matchRank, right.matchRank, "desc");
  if (rankDelta !== 0) {
    return rankDelta;
  }

  return compareString(left.sortKey, right.sortKey, direction);
};

export const compareTrackSort = (
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

export const compareArtistSort = (
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

export const compareAlbumSort = (
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

export const comparePlaylistSort = (
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
