import { createHash } from "node:crypto";
import { normalize } from "node:path";
import { normalizeSearchTerm } from "@aural/domain/src/search";

export const nowIso = () => new Date().toISOString();

export const normalizePath = (value: string) => normalize(value);

export const pathKey = (value: string) => normalizePath(value).toLocaleLowerCase();

export const hashText = (value: string) => createHash("sha1").update(value).digest("hex");

export const buildSearchBlob = (...values: Array<string | null | undefined>) =>
  values
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeSearchTerm(value))
    .join(" ");

export const toBoolean = (value: unknown) => Boolean(value);
