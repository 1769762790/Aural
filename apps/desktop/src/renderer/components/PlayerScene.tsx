import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ListMusic,
  Music4,
  Pause,
  Play,
  SkipBack,
  SkipForward
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { VolumeControl } from "@renderer/components/VolumeControl";
import { extractCoverTheme, getFallbackCoverTheme } from "@renderer/lib/coverTheme";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

const buildQualityBadges = (format: string, bitrate: number | null, sampleRate: number | null) => {
  const badges: string[] = [];

  if (["flac", "wav", "aiff", "alac"].includes(format.toLowerCase())) {
    badges.push("Lossless");
  } else if ((bitrate ?? 0) >= 320_000) {
    badges.push("High Bitrate");
  }

  badges.push(sampleRate ? `${Math.round(sampleRate / 1000)} kHz` : format.toUpperCase());
  return badges.slice(0, 2);
};

interface PlayerSceneProps {
  onClose?: () => void;
  className?: string;
}

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
  const coverColorEnabled = usePreferencesStore((state) => state.snapshot["appearance.coverColor"] !== false);
  const [coverTheme, setCoverTheme] = useState(getFallbackCoverTheme);

  const hasStaticEmbeddedLyrics =
    lyrics?.source === "embedded" &&
    lyrics.lines.length > 0 &&
    lyrics.lines.every((line) => line.at === 0);

  const activeLyricIndex = useMemo(() => {
    if (hasStaticEmbeddedLyrics) {
      return -1;
    }

    if (!lyrics?.lines.length) {
      return -1;
    }

    for (let index = lyrics.lines.length - 1; index >= 0; index -= 1) {
      if (lyrics.lines[index]!.at <= playback.progressSeconds * 1000) {
        return index;
      }
    }

    return -1;
  }, [hasStaticEmbeddedLyrics, lyrics?.lines, playback.progressSeconds]);

  const timedLyricAnchorIndex = activeLyricIndex >= 0 ? activeLyricIndex : 0;

  const lyricWindow = useMemo(() => {
    if (hasStaticEmbeddedLyrics) {
      return lyrics?.lines ?? [];
    }

    if (!lyrics?.lines.length) {
      return [];
    }

    const start = Math.max(0, timedLyricAnchorIndex - 5);
    const end = Math.min(lyrics.lines.length, timedLyricAnchorIndex + 5);
    return lyrics.lines.slice(start, end);
  }, [hasStaticEmbeddedLyrics, lyrics?.lines, timedLyricAnchorIndex]);

  const coverUrl = currentTrack?.coverPath ? toFileUrl(currentTrack.coverPath) : null;
  const coverBackground = currentTrack?.coverPath
    ? { backgroundImage: `url("${coverUrl}")` }
    : {
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(125,89,255,0.42), rgba(75,115,255,0.28), rgba(248,184,95,0.12))"
      };

  const ambientBackground =
    currentTrack?.coverPath && coverColorEnabled
      ? {
          backgroundImage: `
            radial-gradient(circle at 18% 24%, ${coverTheme.glow} 0%, transparent 30%),
            radial-gradient(circle at 68% 52%, color-mix(in srgb, hsl(var(--background)) 14%, transparent) 0%, transparent 34%),
            linear-gradient(110deg, ${coverTheme.shadow} 0%, color-mix(in srgb, hsl(var(--background)) 64%, transparent) 42%, ${coverTheme.secondary} 100%),
            url("${coverUrl}")
          `
        }
      : {
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(103,65,222,0.34), transparent 28%), radial-gradient(circle at 72% 55%, rgba(147,51,234,0.26), transparent 30%), linear-gradient(135deg, color-mix(in srgb, hsl(var(--background)) 82%, #0f172a) 0%, color-mix(in srgb, hsl(var(--primary)) 24%, #1e1b4b) 52%, color-mix(in srgb, hsl(var(--background)) 72%, #140d2c) 100%)"
        };

  const qualityBadges = currentTrack
    ? buildQualityBadges(currentTrack.format, currentTrack.bitrate, currentTrack.sampleRate)
    : [];
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

  useEffect(() => {
    setQueueOpen(false);
  }, [setQueueOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!coverColorEnabled || !coverUrl) {
      setCoverTheme(getFallbackCoverTheme());
      return;
    }

    void extractCoverTheme(coverUrl).then((nextTheme) => {
      if (!cancelled) {
        setCoverTheme(nextTheme);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [coverColorEnabled, coverUrl]);

  if (!currentTrack) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="border-border bg-card/82">
          <CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/16 text-primary">
              <Music4 className="size-9" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-foreground">No active track</h2>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                Start playback from Library, Collection, or Home to load cover art, lyrics, and the immersive now playing scene.
              </p>
            </div>
              <Button onClick={() => void navigate("/songs")}>Open Library</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full min-h-full overflow-hidden rounded-none border-0 bg-background", className)}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ ...ambientBackground, opacity: "var(--player-cover-opacity)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 18%, color-mix(in srgb, hsl(var(--primary)) 20%, transparent) 0%, transparent 28%), radial-gradient(circle at 66% 46%, color-mix(in srgb, hsl(var(--primary)) 10%, transparent) 0%, transparent 34%), linear-gradient(180deg, var(--player-scene-veil), color-mix(in srgb, var(--player-scene-veil) 78%, transparent) 60%, color-mix(in srgb, var(--player-bottom-wash) 82%, transparent))"
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--player-scene-side) 0%, color-mix(in srgb, hsl(var(--primary)) 8%, transparent) 38%, color-mix(in srgb, var(--player-scene-side) 56%, transparent) 100%)"
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

      <div className="relative mx-auto flex h-full min-h-full w-full max-w-[1920px] flex-col px-8 pb-11 pt-5 lg:px-12 lg:pb-14 lg:pt-6 2xl:px-16">
        <div className="grid flex-1 items-start gap-10 pt-[calc(var(--titlebar-area-height)+34px)] md:grid-cols-[minmax(320px,460px)_minmax(0,1fr)] md:gap-14 xl:grid-cols-[minmax(360px,500px)_minmax(0,1fr)] xl:gap-20 2xl:gap-24">
          <section className="h-full w-full max-w-[clamp(320px,28vw,460px)] flex flex-col items-start justify-center md:justify-self-start">
            <div className="flex w-full flex-col space-y-7">
              <div
                className="mb-10 aspect-square  md:w-[250px] lg:w-[300px] xl:w-[500px] max-w-full shrink-0 rounded-[18px] bg-cover bg-center shadow-[0_26px_60px_rgba(0,0,0,0.38)]"
              >
                <div
                  className={cn(
                    "h-full w-full rounded-[18px] bg-cover bg-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                  )}
                  style={coverBackground}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {qualityBadges.map((entry) => (
                    <Badge
                      key={entry}
                      variant="secondary"
                      className="rounded-[5px] border-[color:var(--player-line)] bg-[var(--player-faint)] px-2.5 py-1 text-[9px] tracking-[0.22em] text-[var(--player-muted)]"
                    >
                      {entry}
                    </Badge>
                  ))}
                </div>

                <div className="min-w-0 max-w-full space-y-1.5">
                  <h1 className="truncate text-center text-[36px] font-black leading-[0.94] tracking-[0.1em] text-[var(--player-foreground)]">
                    {currentTrack.title}
                  </h1>
                  <p className="truncate text-center text-[20px] font-medium tracking-[0.05em] text-[var(--player-muted)]">
                    {currentTrack.artist}
                    <span className="mx-2.5 text-[var(--player-faint)]">&bull;</span>
                    <span className="text-[var(--player-soft)]">{currentTrack.album}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex h-full min-h-[520px] w-full max-w-[1100px] flex-col justify-center overflow-hidden lg:justify-self-stretch xl:max-w-[1200px]">

            {lyricsEnabled && lyricWindow.length ? (
              hasStaticEmbeddedLyrics ? (
                <div className="flex min-h-[520px] items-center justify-center">
                  <div className="max-w-[680px] space-y-5 text-center">
                    {lyricWindow.map((line, index) => (
                      <p
                        key={`${index}-${line.text}`}
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
              ) : (
                <div className="relative min-h-[520px] overflow-hidden pr-4 text-left lg:pl-4 xl:pl-8 2xl:pl-12">
                  {lyricWindow.map((line, index) => {
                    const absoluteIndex = Math.max(0, timedLyricAnchorIndex - 5) + index;
                    const relativeIndex = absoluteIndex - timedLyricAnchorIndex;
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
                      isActive
                        ? 1
                        : distance === 1
                          ? 0.82
                          : distance === 2
                            ? 0.72
                            : 0.62;

                    return (
                      <p
                        key={`${line.at}-${line.text}`}
                        className="absolute left-0 right-0 max-w-[100%] text-left transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                        style={{
                          top: "50%",
                          opacity: isVisible ? opacity : 0,
                          filter: `blur(${isActive ? 0 : Math.min(distance * 0.7, 2.8)}px)`,
                          transform: `translateY(calc(-50% + ${translateY}px)) scale(${scale})`,
                          transformOrigin: "left center"
                        }}
                      >
                        <span
                          className={
                            isActive
                              ? "block text-[54px] font-black leading-[0.95] tracking-[0.01em] text-[var(--player-foreground)] line-height-[1.02] xl:text-[48px] 2xl:text-[55px]"
                              : "block text-[34px] font-semibold leading-[1.03] tracking-[0.01em] text-[var(--player-soft)] line-height-[1.02] xl:text-[38px] 2xl:text-[42px]"
                          }
                        >
                          {line.text || "..."}
                        </span>
                      </p>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="flex min-h-[520px] items-center justify-center">
                <div className="text-center">
                  <p className="text-[58px] font-black tracking-[0.1em] text-[var(--player-foreground)]">
                    {lyricsEnabled ? "No Lyrics" : "Lyrics Disabled"}
                  </p>
                  <p className="mt-4 text-base text-[var(--player-soft)]">
                    {lyricsEnabled ? "No local lyric file is available for the current track." : "Re-enable lyrics display from Settings."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-[60] flex justify-center">
          <div className="pointer-events-auto w-full max-w-[min(1120px,78vw)] px-4 2xl:max-w-[min(1320px,82vw)]">
            <div
              className="relative rounded-xl border px-6 pb-2 pt-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl overflow-hidden"
              style={{
                borderColor: "var(--player-line)",
              }}
            >
              <div className="absolute left-0 right-0 top-0">
                <Slider
                  min={0}
                  max={Math.max(playback.durationSeconds, 0)}
                  step={0.1}
                  value={[Math.min(playback.progressSeconds, Math.max(playback.durationSeconds, 0))]}
                  onValueChange={(values) => {
                    const next = values[0];
                    if (typeof next === "number" && Number.isFinite(next)) {
                      seekTo(next);
                    }
                  }}
                  aria-label="Seek playback position"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-[220px_minmax(0,1fr)_180px] items-center gap-5">
                <div className="flex w-[220px] min-w-[220px] items-center gap-3 overflow-hidden">
                  <div
                    className="size-11 rounded-[12px] border border-[color:var(--player-line)] bg-cover bg-center"
                    style={coverBackground}
                  />
                  <div className="min-w-0 max-w-[160px]">
                    <p className="truncate text-sm font-semibold text-[var(--player-foreground)]">{currentTrack.title}</p>
                    <p className="truncate text-xs text-[var(--player-soft)]">{currentTrack.artist}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-full text-[var(--player-muted)] hover:text-[var(--player-foreground)]"
                    onClick={() => void playPrevious()}
                  >
                    <SkipBack className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="size-12 rounded-full bg-primary text-primary-foreground shadow-[0_12px_26px_rgba(0,0,0,0.18)] hover:bg-primary/90"
                    onClick={() => void togglePlay()}
                  >
                    {playback.isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-full text-[var(--player-muted)] hover:text-[var(--player-foreground)]"
                    onClick={() => void playNext()}
                  >
                    <SkipForward className="size-4" />
                  </Button>
                </div>

                <div className="ml-auto flex w-[180px] min-w-[180px] items-center justify-end gap-3">
                  <VolumeControl
                    className="w-full justify-end"
                    trackClassName="w-20"
                    iconClassName="text-[var(--player-muted)]"
                    buttonClassName="hover:text-[var(--player-foreground)]"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "size-8 rounded-full text-[var(--player-muted)] transition-colors hover:text-[var(--player-foreground)]",
                      queueOpen && "bg-[var(--player-faint)] text-[var(--player-foreground)]"
                    )}
                    onClick={() => toggleQueue()}
                  >
                    <ListMusic className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
