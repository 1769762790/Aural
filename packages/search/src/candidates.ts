import type { SearchCandidateForms } from "./ranking";
import type {
  SearchAlbumRecord,
  SearchArtistRecord,
  SearchPlaylistRecord,
  SearchTrackRecord
} from "./source";

export const trackCandidate = (record: SearchTrackRecord): SearchCandidateForms => ({
  texts: [record.title, record.artist, record.album, record.albumArtist, record.directory, record.searchText ?? null].filter(
    Boolean
  ) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

export const artistCandidate = (record: SearchArtistRecord): SearchCandidateForms => ({
  texts: [record.name, record.searchText ?? record.normalizedName].filter(Boolean) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

export const albumCandidate = (record: SearchAlbumRecord): SearchCandidateForms => ({
  texts: [record.title, record.artist, record.searchText ?? null].filter(Boolean) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

export const playlistCandidate = (record: SearchPlaylistRecord): SearchCandidateForms => ({
  texts: [record.name, record.searchText ?? null].filter(Boolean) as string[],
  pinyin: record.pinyin,
  pinyinInitials: record.pinyinInitials
});

export const trackSortKey = (record: SearchTrackRecord) => record.title || record.path;
export const artistSortKey = (record: SearchArtistRecord) => record.name;
export const albumSortKey = (record: SearchAlbumRecord) => record.title;
export const playlistSortKey = (record: SearchPlaylistRecord) => record.name;
