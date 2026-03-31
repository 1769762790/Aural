import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Music4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { PlayerSceneArtworkPanel } from "@renderer/components/player-scene/PlayerSceneArtworkPanel";
import { PlayerSceneDock } from "@renderer/components/player-scene/PlayerSceneDock";
import { buildQualityBadges } from "@renderer/components/player-scene/playerScene.utils";
import type { PlayerSceneProps } from "@renderer/components/player-scene/playerScene.types";
import { usePlayerCoverTheme } from "@renderer/components/player-scene/usePlayerCoverTheme";
import { PlayerLyricsPanel } from "@renderer/components/player-scene/lyrics/PlayerLyricsPanel";
import { usePlayerLyricsViewModel } from "@renderer/components/player-scene/lyrics/usePlayerLyricsViewModel";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const PlayerScene = ({ onClose, className }: PlayerSceneProps) => {
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const lyrics = usePlayerStore((state) => state.lyrics);
  const playback = usePlayerStore((state) => state.playback);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const queueOpen = usePlayerStore((state) => state.queueOpen);
  const toggleQueue = usePlayerStore((state) => state.toggleQueue);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const lyricsEnabled = usePreferencesStore((state) => state.snapshot["lyrics.enabled"] !== false);
  const motionEnabled = usePreferencesStore((state) => state.snapshot["appearance.motion"] !== false);
  const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
  const dynamicCoverGradientEnabled = usePreferencesStore(
    (state) => state.snapshot["appearance.dynamicCoverGradient"] !== false
  );
  const artworkBreathingEnabled = usePreferencesStore(
    (state) => state.snapshot["appearance.playerArtworkBreathing"] !== false
  );

  const lyricsViewModel = usePlayerLyricsViewModel(
    currentTrack ? lyrics : null,
    playback.progressSeconds,
    lyricsEnabled
  );
  const coverUrl = currentTrack?.coverPath ? toFileUrl(currentTrack.coverPath) : null;
  const coverTheme = usePlayerCoverTheme(coverUrl, dynamicCoverGradientEnabled, resolvedTheme);

  useEffect(() => {
    setQueueOpen(false);
  }, [setQueueOpen]);

  const handleClose = () => {
    setQueueOpen(false);

    if (onClose) {
      onClose();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    void navigate("/");
  };

  if (!currentTrack) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="border-border bg-card/82">
          <CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/16 text-primary">
              <Music4 className="size-9" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-foreground">
                No active track
              </h2>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                Start playback from Library, Collection, or Home to load cover art, lyrics, and
                the immersive now playing scene.
              </p>
            </div>
            <Button onClick={() => void navigate("/songs")}>Open Library</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const coverBackground = currentTrack.coverPath
    ? { backgroundImage: `url("${coverUrl}")` }
    : {
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(125,89,255,0.42), rgba(75,115,255,0.28), rgba(248,184,95,0.12))"
      };

  const useDynamicCoverGradient = Boolean(currentTrack.coverPath && dynamicCoverGradientEnabled);
  const ambientGradientBackground = useDynamicCoverGradient
    ? {
        backgroundImage: `
          radial-gradient(circle at 14% 22%, ${coverTheme.glowPrimary} 0%, transparent 34%),
          radial-gradient(circle at 82% 28%, ${coverTheme.glowSecondary} 0%, transparent 36%),
          linear-gradient(128deg, ${coverTheme.shadow} 0%, ${coverTheme.primary} 42%, ${coverTheme.secondary} 100%)
        `
      }
    : {
        backgroundImage:
          "radial-gradient(circle at 18% 22%, rgba(103,65,222,0.34), transparent 28%), radial-gradient(circle at 72% 55%, rgba(147,51,234,0.26), transparent 30%), linear-gradient(135deg, color-mix(in srgb, hsl(var(--background)) 82%, #0f172a) 0%, color-mix(in srgb, hsl(var(--primary)) 24%, #1e1b4b) 52%, color-mix(in srgb, hsl(var(--background)) 72%, #140d2c) 100%)"
      };
  const ambientTextureBackground =
    useDynamicCoverGradient && coverUrl
      ? {
          backgroundImage: `url("${coverUrl}")`
        }
      : null;

  const qualityBadges = buildQualityBadges(
    currentTrack.format,
    currentTrack.bitrate,
    currentTrack.sampleRate
  );

  return (
    <div
      className={cn(
        "relative h-full min-h-full overflow-hidden rounded-none border-0 bg-background",
        className
      )}
    >
      <div
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={ambientGradientBackground}
      />
      {ambientTextureBackground ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out"
          style={{
            // ...ambientTextureBackground,
            opacity: "calc(var(--player-cover-opacity) * 0.16)",
            mixBlendMode: "soft-light",
            filter: "saturate(0.82) blur(1px)"
          }}
        />
      ) : null}
      <div
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{
          backgroundImage: useDynamicCoverGradient
            ? `
                radial-gradient(circle at 18% 18%, color-mix(in srgb, ${coverTheme.accent} 20%, transparent) 0%, transparent 26%),
                radial-gradient(circle at 64% 44%, color-mix(in srgb, ${coverTheme.secondary} 12%, transparent) 0%, transparent 30%),
                linear-gradient(180deg, ${coverTheme.overlay} 0%, color-mix(in srgb, ${coverTheme.overlay} 74%, transparent) 60%, color-mix(in srgb, var(--player-bottom-wash) 84%, transparent) 100%)
              `
            : "radial-gradient(circle at 14% 18%, color-mix(in srgb, hsl(var(--primary)) 20%, transparent) 0%, transparent 28%), radial-gradient(circle at 66% 46%, color-mix(in srgb, hsl(var(--primary)) 10%, transparent) 0%, transparent 34%), linear-gradient(180deg, var(--player-scene-veil), color-mix(in srgb, var(--player-scene-veil) 78%, transparent) 60%, color-mix(in srgb, var(--player-bottom-wash) 82%, transparent))"
        }}
      />
      <div
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{
          backgroundImage: useDynamicCoverGradient
            ? `
                linear-gradient(
                  90deg,
                  color-mix(in srgb, ${coverTheme.shadow} 56%, transparent) 0%,
                  color-mix(in srgb, ${coverTheme.primary} 12%, transparent) 34%,
                  color-mix(in srgb, ${coverTheme.overlay} 52%, transparent) 100%
                )
              `
            : "linear-gradient(90deg, var(--player-scene-side) 0%, color-mix(in srgb, hsl(var(--primary)) 8%, transparent) 38%, color-mix(in srgb, var(--player-scene-side) 56%, transparent) 100%)"
        }}
      />

      <div
        className="window-no-drag fixed left-4 top-4 z-[120] pointer-events-auto"
        style={{ color: "var(--player-muted)" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full bg-transparent hover:bg-[var(--player-faint)] hover:text-[var(--player-foreground)]"
          onClick={handleClose}
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="relative mx-auto flex h-full min-h-full w-full max-w-[1920px] flex-col px-8 pb-[190px] pt-5 lg:px-12 lg:pb-[190px] lg:pt-6 2xl:px-16">
        <div className="grid flex-1 items-start gap-10 pt-[calc(var(--titlebar-area-height)+34px)] md:grid-cols-[minmax(320px,460px)_minmax(0,1fr)] md:gap-14 xl:grid-cols-[minmax(360px,500px)_minmax(0,1fr)] xl:gap-20 2xl:gap-24">
          <PlayerSceneArtworkPanel
            track={currentTrack}
            coverBackground={coverBackground}
            qualityBadges={qualityBadges}
            isPlaying={playback.isPlaying}
            resolvedTheme={resolvedTheme}
            motionEnabled={motionEnabled}
            artworkBreathingEnabled={artworkBreathingEnabled}
            glowColor={useDynamicCoverGradient ? coverTheme.glowPrimary : undefined}
          />

          <PlayerLyricsPanel viewModel={lyricsViewModel} />
        </div>

        <PlayerSceneDock
          track={currentTrack}
          playback={playback}
          queueOpen={queueOpen}
          motionEnabled={motionEnabled}
          coverBackground={coverBackground}
          onSeek={seekTo}
          onTogglePlay={() => {
            void togglePlay();
          }}
          onPlayPrevious={() => {
            void playPrevious();
          }}
          onPlayNext={() => {
            void playNext();
          }}
          onToggleQueue={() => {
            void toggleQueue();
          }}
        />
      </div>
    </div>
  );
};
