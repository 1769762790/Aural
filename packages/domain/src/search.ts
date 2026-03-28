export const normalizeSearchTerm = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

export const buildSearchBlob = (...values: Array<string | null | undefined>) =>
  values
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeSearchTerm(value))
    .join(" ");

