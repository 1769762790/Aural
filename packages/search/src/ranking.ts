import type { SortDirection } from "@aural/domain/entities";
import { buildSearchQueryForms, compactSearchTerm, normalizeSearchTerm, type SearchQueryForms } from "./normalize";

export type MatchReason = "exact" | "prefix" | "fuzzy" | "pinyin" | "initials";

export interface SearchCandidateForms {
  texts: string[];
  pinyin?: string | null;
  pinyinInitials?: string | null;
}

export interface SearchScore {
  reason: MatchReason;
  score: number;
}

export interface SearchSortOptions {
  sortDirection?: SortDirection;
}

const scoreFromReason = (reason: MatchReason) => {
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

const isPrefixMatch = (candidate: string, query: SearchQueryForms) =>
  candidate === query.normalized ||
  candidate === query.compact ||
  candidate.startsWith(query.normalized) ||
  candidate.startsWith(query.compact);

const isFuzzyMatch = (candidate: string, query: SearchQueryForms) => {
  if (!query.tokens.length) {
    return false;
  }

  let cursor = 0;
  for (const token of query.tokens) {
    const index = candidate.indexOf(token, cursor);
    if (index < 0) {
      return false;
    }
    cursor = index + token.length;
  }

  return true;
};

const pickBestReason = (reasons: MatchReason[]) => {
  for (const reason of ["exact", "pinyin", "prefix", "initials", "fuzzy"] as const) {
    if (reasons.includes(reason)) {
      return reason;
    }
  }

  return null;
};

export const scoreCandidate = (candidate: SearchCandidateForms, term: string): SearchScore | null => {
  const query = buildSearchQueryForms(term);
  if (!query.normalized) {
    return null;
  }

  const normalizedTexts = candidate.texts
    .map((value) => normalizeSearchTerm(value))
    .filter(Boolean);
  const compactTexts = normalizedTexts.map((value) => compactSearchTerm(value));
  const pinyinText = candidate.pinyin ? normalizeSearchTerm(candidate.pinyin) : null;
  const pinyinCompact = candidate.pinyin ? compactSearchTerm(candidate.pinyin) : null;
  const initials = candidate.pinyinInitials ? normalizeSearchTerm(candidate.pinyinInitials).replace(/\s+/g, "") : null;
  const normalizedInitialsQuery = query.compact;

  const reasons: MatchReason[] = [];

  if (normalizedTexts.some((value) => value === query.normalized || value === query.compact)) {
    reasons.push("exact");
  }

  if (
    pinyinText &&
    (pinyinText === query.normalized ||
      pinyinCompact === query.compact ||
      pinyinText.startsWith(query.normalized) ||
      pinyinCompact?.startsWith(query.compact))
  ) {
    reasons.push("pinyin");
  }

  if (
    normalizedTexts.some((value) => isPrefixMatch(value, query)) ||
    (pinyinText ? isPrefixMatch(pinyinText, query) : false)
  ) {
    reasons.push("prefix");
  }

  if (
    initials &&
    normalizedInitialsQuery.length >= 2 &&
    (initials === normalizedInitialsQuery || initials.startsWith(normalizedInitialsQuery))
  ) {
    reasons.push("initials");
  }

  const fuzzyTarget = [...normalizedTexts, ...compactTexts, pinyinText ?? "", pinyinCompact ?? ""]
    .filter(Boolean)
    .join(" ");

  if (isFuzzyMatch(fuzzyTarget, query)) {
    reasons.push("fuzzy");
  }

  const reason = pickBestReason(reasons);
  if (!reason) {
    return null;
  }

  return {
    reason,
    score: scoreFromReason(reason)
  };
};
