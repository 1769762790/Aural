import type { PlayerLyricsEmptyStateProps } from "../playerScene.types";

export const PlayerLyricsEmptyState = ({ disabled = false }: PlayerLyricsEmptyStateProps) => {
  return (
    <div className="flex min-h-[520px] items-center justify-center">
      <div className="text-center">
        <p className="text-[58px] font-black tracking-[0.1em] text-[var(--player-foreground)]">
          {disabled ? "Lyrics Disabled" : "No Lyrics"}
        </p>
        <p className="mt-4 text-base text-[var(--player-soft)]">
          {disabled
            ? "Re-enable lyrics display from Settings."
            : "No local lyric file is available for the current track."}
        </p>
      </div>
    </div>
  );
};
