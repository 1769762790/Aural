import { extname, join, dirname } from "node:path";
import { AUDIO_EXTENSIONS } from "./types";

export const isAudioFile = (filePath: string, allowedExtensions: readonly string[] = AUDIO_EXTENSIONS as readonly string[]) =>
  allowedExtensions.includes(extname(filePath).toLowerCase());

export const candidateLyricPaths = (filePath: string) => {
  const folder = dirname(filePath);
  const base = filePath.split(/[\\/]/).pop() ?? "track";
  const extension = extname(filePath);
  const baseName = extension.length > 0 && base.endsWith(extension) ? base.slice(0, -extension.length) : base;
  return [join(folder, `${baseName}.lrc`)];
};

export const commonCoverNames = ["cover.jpg", "cover.jpeg", "folder.jpg", "folder.jpeg", "art.jpg", "art.jpeg", "front.jpg", "front.jpeg", "album.jpg", "album.jpeg"];

export const candidateCoverPaths = (directory: string) => commonCoverNames.map((name) => join(directory, name));
