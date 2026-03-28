import type { Track } from "@aural/domain/src/entities";
import type { TrackId } from "@aural/domain/src/ids";

export const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".aac", ".m4a", ".alac", ".ogg", ".wma"] as const;

export interface EmbeddedArtwork {
  data: Uint8Array;
  format: string | null;
}

export interface AudioFileMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  year: number | null;
  genre: string | null;
  duration: number;
  format: string;
  bitrate: number | null;
  sampleRate: number | null;
  embeddedArtwork: EmbeddedArtwork | null;
  embeddedLyrics: string | null;
}

export interface ScannedTrackInput {
  id?: TrackId;
  path: string;
  directory: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  year: number | null;
  genre: string | null;
  duration: number;
  format: string;
  bitrate: number | null;
  sampleRate: number | null;
  coverPath: string | null;
  lyricPath: string | null;
  embeddedLyrics: string | null;
  fileHash: string | null;
}

export interface ImportFoldersResult {
  scanRunId: string;
  folders: string[];
  scannedFiles: number;
  importedTracks: number;
  invalidFiles: number;
}

export interface RemoveFolderResult {
  folder: string;
  removedFromScanList: boolean;
  removedTracks: number;
  activeFolders: string[];
}

export interface FileScanResult {
  path: string;
  metadata: AudioFileMetadata;
  fileHash: string;
  lyricPath: string | null;
  coverPath: string | null;
  embeddedLyrics: string | null;
  existingTrack: Track | null;
}
