import type { PlayerLyricsStaticViewProps } from "../playerScene.types";

export const PlayerLyricsStaticView = ({ lines }: PlayerLyricsStaticViewProps) => {
  return (
    <div className="flex min-h-[520px] items-center justify-center">
      <div className="max-w-[680px] space-y-5 text-center">
        {lines.map((line, index) => (
          <p
            key={`${line.absoluteIndex}-${line.text}`}
            className={
              index === 0
                ? "text-[44px] font-black leading-[1.02] tracking-[0.08em] text-[var(--player-foreground)]"
                : "text-[30px] font-semibold leading-[1.08] tracking-[-0.06em] text-[var(--player-soft)]"
            }
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
};
