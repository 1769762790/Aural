import { cn } from "@/lib/utils";
import type { PlayerLyricsPanelProps } from "../playerScene.types";
import { PlayerLyricsEmptyState } from "./PlayerLyricsEmptyState";
import { PlayerLyricsStaticView } from "./PlayerLyricsStaticView";
import { PlayerLyricsTimedView } from "./PlayerLyricsTimedView";

export const PlayerLyricsPanel = ({ viewModel, className }: PlayerLyricsPanelProps) => {
  return (
    <section
      className={cn(
        "relative flex h-full min-h-[520px] w-full max-w-[1100px] flex-col justify-center overflow-hidden lg:justify-self-stretch xl:max-w-[1200px]",
        className
      )}
    >
      {viewModel.mode === "static" ? (
        <PlayerLyricsStaticView lines={viewModel.visibleLines} />
      ) : viewModel.mode === "timed" ? (
        <PlayerLyricsTimedView lines={viewModel.visibleLines} anchorIndex={viewModel.anchorIndex} />
      ) : (
        <PlayerLyricsEmptyState disabled={viewModel.mode === "disabled"} />
      )}
    </section>
  );
};
