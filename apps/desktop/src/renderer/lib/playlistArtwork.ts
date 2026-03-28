import type { Track } from "@aural/domain";
import { toFileUrl } from "@renderer/lib/fileUrl";

const gradientColorPresets = [
  ["rgba(115,84,255,0.95)", "rgba(32,196,255,0.78)", "rgba(255,138,76,0.54)"],
  ["rgba(255,115,179,0.95)", "rgba(145,92,255,0.82)", "rgba(59,130,246,0.48)"],
  ["rgba(255,163,67,0.92)", "rgba(255,99,132,0.76)", "rgba(85,66,255,0.52)"],
  ["rgba(38,208,124,0.9)", "rgba(29,78,216,0.72)", "rgba(147,51,234,0.5)"],
  ["rgba(255,210,63,0.88)", "rgba(249,115,22,0.72)", "rgba(220,38,38,0.48)"]
] as const;

const gradientDirections = [
  "135deg",
  "35deg",
  "215deg",
  "315deg",
  "to right",
  "to left",
  "to top right",
  "to bottom left",
  "to bottom right"
] as const;

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const gradientForSeed = (seed: string) => {
  const baseHash = hashSeed(seed);
  const colors = gradientColorPresets[baseHash % gradientColorPresets.length]!;
  const direction = gradientDirections[Math.floor(baseHash / gradientColorPresets.length) % gradientDirections.length]!;

  return `linear-gradient(${direction}, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
};

export const getTrackTime = (track: Track) => new Date(track.lastPlayedAt ?? track.addedAt).getTime();

export const buildPlaylistHeroArtwork = (seed: string, coverPath: string | null) =>
  coverPath
    ? {
        backgroundImage: `
          url("${toFileUrl(coverPath)}")
        `
      }
    : {
        backgroundImage: gradientForSeed(seed)
      };

export const buildPlaylistCardArtwork = (seed: string, coverPath: string | null) =>
  coverPath
    ? {
        backgroundImage: `url("${toFileUrl(coverPath)}")`
      }
    : {
        backgroundImage: gradientForSeed(seed)
      };
