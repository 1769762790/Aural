const LOSSLESS_FORMATS = new Set(["flac", "wav", "aiff", "alac"]);

export const buildQualityBadges = (
  format: string,
  bitrate: number | null,
  sampleRate: number | null
) => {
  const badges: string[] = [];

  if (LOSSLESS_FORMATS.has(format.toLowerCase())) {
    badges.push("Lossless");
  } else if ((bitrate ?? 0) >= 320_000) {
    badges.push("High Bitrate");
  }

  badges.push(sampleRate ? `${Math.round(sampleRate / 1000)} kHz` : format.toUpperCase());
  return badges.slice(0, 2);
};
