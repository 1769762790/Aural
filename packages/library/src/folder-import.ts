// @ts-ignore
import { stat } from "node:fs/promises";
import type { TrackId } from "@aural/domain";
import type { AuralRepository } from "@aural/data";
import { importFolders as runFolderImport, ingestTrackFile } from "./track-ingest";
import type { ImportFoldersResult, RemoveFolderResult } from "./types";
import type { TagEncodingPreference } from "./metadata";
import type { ScanRules } from "./scanner";

interface FolderImportOptions {
  repository: AuralRepository;
  artworkCacheDir?: string;
}

export const importFolders = (
  options: FolderImportOptions,
  paths: string[],
  scanRules: ScanRules,
  tagEncodingPreference: TagEncodingPreference
): Promise<ImportFoldersResult> => runFolderImport(options, paths, scanRules, tagEncodingPreference);

export const rescanFolders = (
  options: FolderImportOptions,
  scanRules: ScanRules,
  tagEncodingPreference: TagEncodingPreference
): Promise<ImportFoldersResult> => {
  const folders = options.repository
    .listScanFolders()
    .filter((folder) => folder.is_active)
    .map((folder) => folder.path);
  return importFolders(options, folders, scanRules, tagEncodingPreference);
};

export const removeFolder = (repository: AuralRepository, path: string): RemoveFolderResult => repository.removeScanFolder(path);

export const syncTrackById = async (
  options: FolderImportOptions,
  trackId: TrackId,
  tagEncodingPreference: TagEncodingPreference
) => {
  const existing = options.repository.findTrackById(trackId);
  if (!existing) {
    return null;
  }

  const fileStat = await stat(existing.path);
  if (!fileStat.isFile()) {
    options.repository.markTracksMissing([trackId]);
    options.repository.refreshLibrarySummaries();
    return options.repository.findTrackById(trackId);
  }

  const saved = await ingestTrackFile(options, existing.path, existing, tagEncodingPreference);
  options.repository.refreshLibrarySummaries();
  return saved;
};
