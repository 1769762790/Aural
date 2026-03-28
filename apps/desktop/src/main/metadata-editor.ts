import { rename, rm } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import type { UpdateTrackMetadataInput } from "@aural/contracts";

type FfmpegCommand = {
  outputOptions(options: string[]): FfmpegCommand;
  output(target: string): FfmpegCommand;
  on(event: "end", listener: () => void): FfmpegCommand;
  on(event: "error", listener: (error: Error, stdout: string, stderr: string) => void): FfmpegCommand;
  run(): FfmpegCommand;
};

type FfmpegModule = {
  (input?: string): FfmpegCommand;
  setFfmpegPath(path: string): void;
};

const require = createRequire(import.meta.url);
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg") as { path: string };
const ffmpeg = require("fluent-ffmpeg") as FfmpegModule;

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const extractFfmpegError = (stderr: string | undefined, fallback: string) => {
  const lines = (stderr ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const meaningful = [...lines]
    .reverse()
    .find(
      (line) =>
        !/^ffmpeg version/i.test(line) &&
        !/^built with/i.test(line) &&
        !/^configuration:/i.test(line) &&
        !/^lib[a-z]/i.test(line) &&
        !/^input #/i.test(line) &&
        !/^metadata:/i.test(line) &&
        !/^stream mapping:/i.test(line)
    );

  return meaningful || fallback;
};

const buildMetadataArgs = (input: UpdateTrackMetadataInput) => {
  const pairs: Array<[string, string | null]> = [
    ["title", input.title],
    ["artist", input.artist],
    ["album", input.album],
    ["album_artist", input.artist],
    ["genre", input.genre],
    ["date", input.year ? String(input.year) : null],
    ["year", input.year ? String(input.year) : null]
  ];

  return pairs.flatMap(([key, value]) => ["-metadata", `${key}=${value ?? ""}`]);
};

const buildOutputArgs = (sourcePath: string, input: UpdateTrackMetadataInput, preserveArtwork: boolean) => {
  const ext = path.extname(sourcePath).toLowerCase();
  const args = ["-y", "-map_metadata", "0", "-map_chapters", "0", "-map", "0:a:0"];

  if (ext === ".mp3") {
    args.push("-c:a", "copy", "-id3v2_version", "3", "-write_id3v1", "1");
    if (preserveArtwork) {
      args.push("-map", "0:v:0?", "-c:v", "copy", "-disposition:v:0", "attached_pic");
    }
  } else {
    if (preserveArtwork) {
      args.push("-map", "0:v?", "-c", "copy");
    } else {
      args.push("-vn", "-c:a", "copy");
    }
  }

  return [...args, ...buildMetadataArgs(input)];
};

const rewriteFileMetadata = (sourcePath: string, destinationPath: string, input: UpdateTrackMetadataInput, preserveArtwork: boolean) =>
  new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .outputOptions(buildOutputArgs(sourcePath, input, preserveArtwork))
      .output(destinationPath)
      .on("end", () => resolve())
      .on("error", (error, _stdout, stderr) => {
        reject(new Error(extractFfmpegError(stderr, error.message)));
      })
      .run();
  });

export const createMetadataEditor = () => ({
  async updateTrackMetadata(sourcePath: string, input: UpdateTrackMetadataInput) {
    const parsedPath = path.parse(sourcePath);
    const stamp = `${Date.now()}`;
    const tempPath = path.join(parsedPath.dir, `${parsedPath.name}.aural-meta-${stamp}${parsedPath.ext}`);
    const backupPath = path.join(parsedPath.dir, `${parsedPath.name}.aural-backup-${stamp}${parsedPath.ext}`);

    try {
      await rewriteFileMetadata(sourcePath, tempPath, input, true);
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);

      if (!(error instanceof Error) || !/invalid argument/i.test(error.message)) {
        throw error;
      }

      await rewriteFileMetadata(sourcePath, tempPath, input, false);
    }

    try {
      await rename(sourcePath, backupPath);
      await rename(tempPath, sourcePath);
      await rm(backupPath, { force: true });
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      const backupExists = await rename(backupPath, sourcePath).then(
        () => true,
        () => false
      );

      if (!backupExists) {
        throw error;
      }

      throw error;
    }
  }
});
