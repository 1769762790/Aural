// @ts-ignore
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAudioMetadata } from "./metadata";

const inferArtworkExtension = (format: string | null) => {
  const normalized = format?.toLowerCase().trim() ?? "";
  if (!normalized) {
    return ".jpg";
  }

  if (normalized === "image/jpeg" || normalized === "image/jpg" || normalized === "jpeg" || normalized === "jpg") {
    return ".jpg";
  }

  if (normalized === "image/png" || normalized === "png") {
    return ".png";
  }

  if (normalized === "image/webp" || normalized === "webp") {
    return ".webp";
  }

  if (normalized === "image/gif" || normalized === "gif") {
    return ".gif";
  }

  if (normalized === "image/bmp" || normalized === "bmp") {
    return ".bmp";
  }

  const slashIndex = normalized.lastIndexOf("/");
  const extension = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
  return extension ? `.${extension.replace(/[^a-z0-9]/g, "") || "jpg"}` : ".jpg";
};

export const writeEmbeddedArtwork = async (
  cacheDir: string | undefined,
  fileHash: string,
  embeddedArtwork: NonNullable<Awaited<ReturnType<typeof readAudioMetadata>>["embeddedArtwork"]>
) => {
  if (!cacheDir) {
    return null;
  }

  await mkdir(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, `${fileHash}${inferArtworkExtension(embeddedArtwork.format)}`);

  try {
    const existingStat = await stat(filePath);
    if (existingStat.isFile() && existingStat.size > 0) {
      return filePath;
    }
  } catch {
    // Continue and write the cached artwork.
  }

  await writeFile(filePath, Buffer.from(embeddedArtwork.data));
  return filePath;
};
