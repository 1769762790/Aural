import type { PlayerLyricsTimedViewProps } from "../playerScene.types";
import { PlayerLyricsKaraokeLine } from "./PlayerLyricsKaraokeLine";

export const PlayerLyricsTimedView = ({ lines, anchorIndex }: PlayerLyricsTimedViewProps) => {
  return (
    <div className="relative min-h-[520px] overflow-hidden pr-4 text-left lg:pl-4 xl:pl-8 2xl:pl-12">
      {lines.map((line) => {
        const relativeIndex = line.absoluteIndex - anchorIndex;
        const distance = Math.abs(relativeIndex);
        const isActive = relativeIndex === 0;
        const isVisible = relativeIndex >= -4 && relativeIndex <= 3;
        const opacity =
          isActive
            ? 1
            : distance === 1
              ? 0.42
              : distance === 2
                ? 0.22
                : distance === 3
                  ? 0.1
                  : distance === 4
                    ? 0.04
                    : 0;
        const translateY = relativeIndex * 92;
        const scale =
          isActive ? 1 : distance === 1 ? 0.82 : distance === 2 ? 0.72 : 0.62;
        const activeClassName =
          "block text-[54px] font-black leading-[0.95] tracking-[0.01em] text-[var(--player-foreground)] line-height-[1.02] xl:text-[48px] 2xl:text-[55px]";
        const inactiveClassName =
          "block text-[34px] font-semibold leading-[1.03] tracking-[0.01em] text-[var(--player-soft)] line-height-[1.02] xl:text-[38px] 2xl:text-[42px]";

        return (
          <p
            key={`${line.at}-${line.text}-${line.absoluteIndex}`}
            className="absolute left-0 right-0 max-w-[100%] text-left transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={{
              top: "50%",
              opacity: isVisible ? opacity : 0,
              filter: `blur(${isActive ? 0 : Math.min(distance * 0.7, 2.8)}px)`,
              transform: `translateY(calc(-50% + ${translateY}px)) scale(${scale})`,
              transformOrigin: "left center"
            }}
          >
            {isActive && line.isKaraoke ? (
              <PlayerLyricsKaraokeLine
                text={line.text}
                progress={line.karaokeProgress}
                className="block text-[54px] font-black leading-[0.95] tracking-[0.01em] text-[var(--player-soft)] opacity-45 line-height-[1.02] xl:text-[48px] 2xl:text-[55px]"
                highlightClassName={activeClassName}
              />
            ) : (
              <span className={isActive ? activeClassName : inactiveClassName}>
                {line.text || "..."}
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
};
