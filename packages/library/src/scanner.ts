import { execFile } from "node:child_process";
import { opendir, stat } from "node:fs/promises";
import { dirname, extname, normalize, resolve } from "node:path";
import { isAudioFile } from "./paths";
import { AUDIO_EXTENSIONS } from "./types";

export const normalizeFolderPath = (folderPath: string) => normalize(resolve(folderPath));

export const isPathWithinFolder = (filePath: string, folderPath: string) => {
  const normalizedFile = normalizePathForComparison(filePath);
  const normalizedFolder = normalizePathForComparison(folderPath);
  return normalizedFile === normalizedFolder || normalizedFile.startsWith(`${normalizedFolder}\\`);
};

const normalizePathForComparison = (value: string) => normalize(resolve(value)).toLowerCase();

export interface ScanRules {
  allowedFormats?: string[];
  minFileMb?: number;
  excludeHidden?: boolean;
}

const normalizeFormat = (format: string) => format.trim().toLowerCase().replace(/^\./, "");

const resolveAllowedExtensions = (allowedFormats: string[] | undefined): readonly string[] => {
  if (!allowedFormats || allowedFormats.length === 0) {
    return [...AUDIO_EXTENSIONS];
  }

  const normalized = allowedFormats
    .map(normalizeFormat)
    .filter(Boolean)
    .map((format) => `.${format}`);

  return [...new Set(normalized)];
};

const minFileBytes = (value: number | undefined) => Math.max(0, Number.isFinite(value) ? Math.floor((value ?? 0) * 1024 * 1024) : 0);

const readWindowsHiddenAttribute = (targetPath: string) =>
  new Promise<boolean>((resolveResult) => {
    if (process.platform !== "win32") {
      resolveResult(false);
      return;
    }

    execFile("attrib", [targetPath], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolveResult(false);
        return;
      }

      const firstLine = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

      if (!firstLine) {
        resolveResult(false);
        return;
      }

      const slashIndex = firstLine.indexOf("\\");
      const attributes = (slashIndex >= 0 ? firstLine.slice(0, slashIndex) : firstLine).replace(/\s+/g, "").toUpperCase();
      resolveResult(attributes.includes("H"));
    });
  });

const isEntryHidden = async (entryPath: string, entryName: string, cache: Map<string, boolean>) => {
  if (entryName.startsWith(".")) {
    return true;
  }

  if (process.platform !== "win32") {
    return false;
  }

  const key = entryPath.toLowerCase();
  if (cache.has(key)) {
    return cache.get(key) ?? false;
  }

  const hidden = await readWindowsHiddenAttribute(entryPath);
  cache.set(key, hidden);
  return hidden;
};

export const collectAudioFiles = async (folders: string[], rules: ScanRules = {}) => {
  const results: string[] = [];
  const seen = new Set<string>();
  const hiddenCache = new Map<string, boolean>();
  const extensions = resolveAllowedExtensions(rules.allowedFormats);
  const excludeHidden = rules.excludeHidden === true;
  const minimumBytes = minFileBytes(rules.minFileMb);

  const walk = async (folderPath: string): Promise<void> => {
    try {
      const directory = await opendir(folderPath);
      for await (const entry of directory) {
        const fullPath = resolve(folderPath, entry.name);
        const hidden = excludeHidden ? await isEntryHidden(fullPath, entry.name, hiddenCache) : false;
        if (hidden) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }
        if (!entry.isFile() || !isAudioFile(fullPath, extensions) || seen.has(fullPath.toLowerCase())) {
          continue;
        }

        if (minimumBytes > 0) {
          try {
            const fileStats = await stat(fullPath);
            if (!fileStats.isFile() || fileStats.size < minimumBytes) {
              continue;
            }
          } catch {
            continue;
          }
        }

        seen.add(fullPath.toLowerCase());
        results.push(fullPath);
      }
    } catch {
      return;
    }
  };

  for (const folder of folders) {
    const normalizedFolder = normalizeFolderPath(folder);
    if (excludeHidden && (await isEntryHidden(normalizedFolder, normalizedFolder.split(/[\\/]/).pop() ?? "", hiddenCache))) {
      continue;
    }
    await walk(normalizedFolder);
  }

  return results.sort((left, right) => left.localeCompare(right));
};

export const inferTrackDirectory = (filePath: string) => dirname(resolve(filePath));
