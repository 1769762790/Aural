import type { PlayerLyricsKaraokeLineProps } from "../playerScene.types";

export const PlayerLyricsKaraokeLine = ({
  text,
  progress,
  className,
  highlightClassName
}: PlayerLyricsKaraokeLineProps) => {
  const safeText = text || "...";
  const width = `${Math.max(0, Math.min(progress, 1)) * 100}%`;

  return (
    <span className="relative block max-w-full overflow-hidden whitespace-pre-wrap">
      <span className={className}>{safeText}</span>
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap"
        style={{ width }}
      >
        <span className={highlightClassName}>{safeText}</span>
      </span>
    </span>
  );
};
