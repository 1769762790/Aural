import type { CSSProperties, ReactNode } from "react";
import type { LyricsResponse } from "@aural/contracts";
import type { PlaybackState, Track } from "@aural/domain";

export interface PlayerSceneProps {
  onClose?: () => void;
  className?: string;
}

export type PlayerLyricsMode = "disabled" | "empty" | "static" | "timed";
export type PlayerLyricsLine = LyricsResponse["lines"][number];

export interface PlayerVisibleLyricLine extends PlayerLyricsLine {
  absoluteIndex: number;
  isKaraoke: boolean;
  karaokeProgress: number;
  activeSegmentIndex: number;
}

export interface PlayerLyricsViewModel {
  mode: PlayerLyricsMode;
  activeLyricIndex: number;
  anchorIndex: number;
  visibleLines: PlayerVisibleLyricLine[];
  hasStaticEmbeddedLyrics: boolean;
}

export interface PlayerSceneArtworkPanelProps {
  track: Track;
  coverBackground: CSSProperties;
  qualityBadges: string[];
  isPlaying: boolean;
  resolvedTheme: "light" | "dark";
  motionEnabled: boolean;
  artworkBreathingEnabled: boolean;
  glowColor?: string;
}

export interface PlayerSceneDockProps {
  track: Track;
  playback: PlaybackState;
  queueOpen: boolean;
  motionEnabled: boolean;
  coverBackground: CSSProperties;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onPlayPrevious: () => void;
  onPlayNext: () => void;
  onToggleQueue: () => void;
}

export interface PlayerLyricsPanelProps {
  viewModel: PlayerLyricsViewModel;
  className?: string;
}

export interface PlayerLyricsEmptyStateProps {
  disabled?: boolean;
}

export interface PlayerLyricsStaticViewProps {
  lines: PlayerVisibleLyricLine[];
}

export interface PlayerLyricsTimedViewProps {
  lines: PlayerVisibleLyricLine[];
  anchorIndex: number;
}

export interface PlayerLyricsKaraokeLineProps {
  text: string;
  progress: number;
  className: string;
  highlightClassName: string;
}

export interface PlayerSceneSectionHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}
