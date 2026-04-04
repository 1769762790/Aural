import { normalizeSearchTerm } from "@aural/domain";
import { scoreCandidate, type MatchReason, type SearchCandidateForms } from "./ranking";

export type TrackSearchSortBy = "relevance" | "title" | "artist" | "album" | "addedAt" | "playCount" | "duration";
export type ArtistSearchSortBy = "relevance" | "name" | "trackCount" | "albumCount";
export type AlbumSearchSortBy = "relevance" | "title" | "artist" | "year" | "trackCount";
export type PlaylistSearchSortBy = "relevance" | "name" | "trackCount" | "updatedAt";

export interface RankedRecord<TRecord> {
  record: TRecord;
  matchRank: number;
  reason: MatchReason;
  sortKey: string;
}

export const limitResults = <T>(results: T[], limit?: number) =>
  typeof limit === "number" && limit >= 0 ? results.slice(0, limit) : results;

export const isQueryBlank = (term: string) => !normalizeSearchTerm(term);

export const rankRecords = <TRecord>(
  records: TRecord[],
  term: string,
  candidateFor: (record: TRecord) => SearchCandidateForms,
  sortKeyFor: (record: TRecord) => string
) =>
  records
    .map((record) => {
      const score = scoreCandidate(candidateFor(record), term);
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
