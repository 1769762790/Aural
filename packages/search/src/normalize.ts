import { normalizeSearchTerm as normalizeDomainSearchTerm } from "@aural/domain/search";

export const normalizeSearchTerm = (value: string) => normalizeDomainSearchTerm(value);

export const compactSearchTerm = (value: string) =>
  normalizeSearchTerm(value).replace(/[\s._\-\\/()+[\]{}:;,'"'"'"!?&|]+/g, "");

export const splitSearchTokens = (value: string) =>
  normalizeSearchTerm(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const buildSearchInitials = (value: string) =>
  splitSearchTokens(value)
    .map((token) => token[0] ?? "")
    .join("");

export interface SearchQueryForms {
  normalized: string;
  compact: string;
  initials: string;
  tokens: string[];
}

export const buildSearchQueryForms = (term: string): SearchQueryForms => {
  const normalized = normalizeSearchTerm(term);
  return {
    normalized,
    compact: compactSearchTerm(term),
    initials: buildSearchInitials(term),
    tokens: splitSearchTokens(term)
  };
};
