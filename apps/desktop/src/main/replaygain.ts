import { createRequire } from "node:module";
import type { ReplayGainAnalysis } from "@aural/contracts";
import type { TrackId } from "@aural/domain";
import type { AuralRepository } from "@aural/data";

type FfmpegCommand = {
  noVideo(): FfmpegCommand;
  audioFilters(filters: string | string[]): FfmpegCommand;
  format(format: string): FfmpegCommand;
  output(target: string): FfmpegCommand;
  on(event: "stderr", listener: (line: string) => void): FfmpegCommand;
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

const NULL_OUTPUT_TARGET = process.platform === "win32" ? "NUL" : "/dev/null";
const TRACK_GAIN_PATTERN = /track_gain\s*=\s*([+-]?\d+(?:\.\d+)?)\s*dB/i;
const TRACK_PEAK_PATTERN = /track_peak\s*=\s*([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseReplayGain = (stderr: string): ReplayGainAnalysis | null => {
  const gainMatch = stderr.match(TRACK_GAIN_PATTERN);
  if (!gainMatch) {
    return null;
  }

  const gainDb = Number.parseFloat(gainMatch[1]);
  if (!Number.isFinite(gainDb)) {
    return null;
  }

  const peakMatch = stderr.match(TRACK_PEAK_PATTERN);
  const peak = peakMatch ? Number.parseFloat(peakMatch[1]) : null;
  const unclampedMultiplier = Math.pow(10, gainDb / 20);
  const peakSafeMultiplier = peak && Number.isFinite(peak) && peak > 0 ? 1 / peak : unclampedMultiplier;
  const recommendedMultiplier = clamp(Math.min(unclampedMultiplier, peakSafeMultiplier), 0.05, 8);

  return {
    gainDb,
    peak: peak && Number.isFinite(peak) ? peak : null,
    recommendedMultiplier,
    unclampedMultiplier
  };
};

const runReplayGainAnalysis = (filePath: string) =>
  new Promise<ReplayGainAnalysis | null>((resolve) => {
    let stderrOutput = "";

    ffmpeg(filePath)
      .noVideo()
      .audioFilters("replaygain")
      .format("null")
      .output(NULL_OUTPUT_TARGET)
      .on("stderr", (line) => {
        stderrOutput += `${line}\n`;
      })
      .on("end", () => {
        resolve(parseReplayGain(stderrOutput));
      })
      .on("error", (_error: Error, _stdout: string, stderr: string) => {
        const parsed = parseReplayGain(`${stderrOutput}\n${stderr ?? ""}`);
        resolve(parsed);
      })
      .run();
  });

export const createReplayGainService = (repository: AuralRepository) => {
  const cache = new Map<string, ReplayGainAnalysis | null>();
  const pending = new Map<string, Promise<ReplayGainAnalysis | null>>();

  return {
    analyzeReplayGain: async (trackId: TrackId): Promise<ReplayGainAnalysis | null> => {
      const track = repository.findTrackById(trackId);
      if (!track || track.status !== "ready") {
        return null;
      }

      const cacheKey = track.fileHash ?? track.path;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey) ?? null;
      }

      const existing = pending.get(cacheKey);
      if (existing) {
        return existing;
      }

      const task = runReplayGainAnalysis(track.path)
        .then((analysis) => {
          cache.set(cacheKey, analysis);
          return analysis;
        })
        .catch(() => {
          cache.set(cacheKey, null);
          return null;
        })
        .finally(() => {
          pending.delete(cacheKey);
        });

      pending.set(cacheKey, task);
      return task;
    }
  };
};
