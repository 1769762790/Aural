import type { Track, TrackId } from "@aural/domain";
import type { ImportFoldersResult, RemoveFolderResult } from "./types";
import type { AuralRepository } from "@aural/data";
import { importFolders, removeFolder, rescanFolders, syncTrackById } from "./folder-import";
import { resolveScanRules, resolveTagEncodingPreference } from "./scan-rules";

export interface LibraryServiceOptions {
  repository: AuralRepository;
  artworkCacheDir?: string;
}

export class LibraryService {
  constructor(private readonly options: LibraryServiceOptions) {}

  async importFolders(paths: string[]): Promise<ImportFoldersResult> {
    return importFolders(this.options, paths, resolveScanRules(this.options.repository), resolveTagEncodingPreference(this.options.repository));
  }

  async rescanFolders(): Promise<ImportFoldersResult> {
    return rescanFolders(this.options, resolveScanRules(this.options.repository), resolveTagEncodingPreference(this.options.repository));
  }

  async removeFolder(path: string): Promise<RemoveFolderResult> {
    return removeFolder(this.options.repository, path);
  }

  async syncTrackById(trackId: TrackId): Promise<Track | null> {
    return syncTrackById(this.options, trackId, resolveTagEncodingPreference(this.options.repository));
  }
}

export const createLibraryService = (options: LibraryServiceOptions | AuralRepository) =>
  new LibraryService("upsertTrack" in options ? { repository: options } : options);
