import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { BrowseMode } from "@aural/domain";
import {
  Repeat,
  ListMusic,
  Moon,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { AppRuntimeBridge } from "@renderer/components/AppRuntimeBridge";
import { GlobalSearchCommand } from "@renderer/components/GlobalSearchCommand";
import { NowPlayingQueueDrawer } from "@renderer/components/NowPlayingQueueDrawer";
import { OnlineAccountControl } from "@renderer/components/online-auth/OnlineAccountControl";
import { PlayerScene } from "@renderer/components/PlayerScene";
import { PlayerAudioBridge } from "@renderer/components/PlayerAudioBridge";
import { SidebarNavigation } from "@renderer/components/SidebarNavigation";
import { VolumeControl } from "@renderer/components/VolumeControl";
import { useImportFolders } from "@renderer/hooks/useImportFolders";
import { formatDuration } from "@renderer/lib/formatters";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { persistSetting } from "@renderer/lib/settingsPersistence";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastNonPlayerRouteRef = useRef("/songs");
  const lastLocalRouteRef = useRef("/songs");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const currentItem = usePlayerStore((state) => state.currentItem);
  const playback = usePlayerStore((state) => state.playback);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const setMode = usePlayerStore((state) => state.setMode);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const queueOpen = usePlayerStore((state) => state.queueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const restoreSessionForMode = usePlayerStore((state) => state.restoreSessionForMode);
  const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
  const browseModePreference = usePreferencesStore((state) => state.snapshot["online.lastMode"]);
  const isPlayerOverlayRoute = location.pathname === "/player";
  const isOnlineRoute = location.pathname.startsWith("/online");
  const browseMode: BrowseMode = isOnlineRoute ? "online" : (browseModePreference === "online" ? "online" : "local");
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useEffect(() => {
    if (location.pathname === "/player") {
      return;
    }

    const route = `${location.pathname}${location.search}${location.hash}`;
    lastNonPlayerRouteRef.current = route || "/songs";
    if (!route.startsWith("/online")) {
      lastLocalRouteRef.current = route || "/songs";
    }
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname !== "/" || browseModePreference !== "online") {
      return;
    }

    void navigate("/online", { replace: true });
  }, [browseModePreference, location.pathname, navigate]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const updateScrollbarWidth = () => {
      const nextWidth = Math.max(scrollContainer.offsetWidth - scrollContainer.clientWidth, 0);
      setScrollbarWidth((previous) => (previous === nextWidth ? previous : nextWidth));
    };

    updateScrollbarWidth();

    const resizeObserver = new ResizeObserver(updateScrollbarWidth);
    resizeObserver.observe(scrollContainer);

    window.addEventListener("resize", updateScrollbarWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollbarWidth);
    };
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (location.pathname !== "/player" || currentItem) {
      return;
    }

    const fallbackRoute =
      lastNonPlayerRouteRef.current && lastNonPlayerRouteRef.current !== "/player"
        ? lastNonPlayerRouteRef.current
        : "/songs";
    void navigate(fallbackRoute, { replace: true });
  }, [currentItem, location.pathname, navigate]);

  const coverUrl = resolvePlayableCoverUrl(currentItem);
  const coverStyle = coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined;

  const isShuffleMode = playback.playbackMode === "shuffle";
  const isRepeatOneMode = playback.playbackMode === "repeat-one";

  const isDark = resolvedTheme === "dark";

  const switchBrowseMode = (mode: BrowseMode) => {
    void persistSetting("online.lastMode", mode);
    usePreferencesStore.getState().update("online.lastMode", mode);
    void restoreSessionForMode(mode, { autoplay: false });

    if (mode === "online") {
      void navigate("/online");
      return;
    }

    void navigate(lastLocalRouteRef.current || "/songs");
  };

  const openPlayerOverlay = () => {
    if (location.pathname === "/player" || !currentItem) {
      return;
    }

    void navigate("/player");
  };

  const openQueueOverlay = () => {
    if (!currentItem) {
      return;
    }

    setQueueOpen(true);
  };

  const closePlayerOverlay = () => {
    const fallbackRoute =
      lastNonPlayerRouteRef.current && lastNonPlayerRouteRef.current !== "/player"
        ? lastNonPlayerRouteRef.current
        : "/songs";
    void navigate(fallbackRoute, { replace: true });
  };

  const togglePlaybackMode = () => {
    const nextMode =
      playback.playbackMode === "queue"
        ? "shuffle"
        : playback.playbackMode === "shuffle"
          ? "repeat-one"
          : "queue";
    setMode(nextMode);
    void persistSetting("player.playbackMode", nextMode);
    usePreferencesStore.getState().update("player.playbackMode", nextMode);
  };

  const toggleThemeMode = () => {
    const nextMode = isDark ? "light" : "dark";
    void persistSetting("appearance.mode", nextMode);
    usePreferencesStore.getState().update("appearance.mode", nextMode);
  };

  return (
    <>
      <div className="relative grid h-screen w-screen grid-cols-[220px_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
        <AppRuntimeBridge />
        <PlayerAudioBridge />

      <aside className="window-safe-top flex h-full flex-col border-r border-sidebar-border bg-sidebar/95 px-5 pb-6 shadow-[inset_-1px_0_0_rgba(167,139,250,0.1)]">
        <div className="space-y-2 px-2">
          <p className="text-[2rem] font-black tracking-[-0.08em] text-foreground text-center">AURAL</p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-border bg-background/70 p-1">
            <Button
              type="button"
              variant={browseMode === "local" ? "default" : "ghost"}
              className="h-10 rounded-[14px]"
              onClick={() => switchBrowseMode("local")}
            >
              Local
            </Button>
            <Button
              type="button"
              variant={browseMode === "online" ? "default" : "ghost"}
              className="h-10 rounded-[14px]"
              onClick={() => switchBrowseMode("online")}
            >
              Online
            </Button>
          </div>

          <SidebarNavigation mode={browseMode} />
        </div>
      </aside>

      <main className="relative flex min-h-0 flex-col overflow-hidden">
        <header className="window-drag window-safe-top-sm relative flex items-center justify-between gap-4 px-5 pb-4 before:absolute before:inset-x-0 before:top-0 before:h-[calc(var(--titlebar-area-height)+24px)] before:bg-gradient-to-b before:from-primary/8 before:to-transparent before:content-['']">
          <GlobalSearchCommand />

          <div className="window-no-drag relative z-10 flex items-center gap-4">
            <OnlineAccountControl />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="size-10 rounded-full border border-border bg-background/70"
              onClick={toggleThemeMode}
            >
              {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
          </div>
        </header>

        <div ref={scrollContainerRef} data-shell-scroll-root="true" className="min-h-0 flex-1 overflow-auto px-5 pb-32 pt-6">
          <Outlet />
        </div>
        <footer
          className="pointer-events-auto absolute bottom-3 left-5 z-30 flex items-center justify-between gap-5 rounded-[26px] bg-card/72 px-6 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.12)] backdrop-blur-lg supports-[backdrop-filter]:bg-card/58 dark:border-border/90 dark:bg-card/52 dark:shadow-[0_22px_56px_rgba(0,0,0,0.28)]"
          style={{ right: `calc(1.25rem + ${scrollbarWidth}px)` }}
        >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className={cn(
              "window-no-drag size-14 shrink-0 overflow-hidden rounded-[18px] border border-border bg-cover bg-center shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-transform",
              currentItem ? "hover:-translate-y-0.5" : "cursor-not-allowed opacity-60"
            )}
            style={
              coverStyle ?? {
                backgroundImage: "linear-gradient(135deg, rgba(117,73,255,0.95), rgba(55,206,255,0.82))"
              }
            }
            onClick={openPlayerOverlay}
            disabled={!currentItem}
            aria-label="Open now playing drawer"
          />
          <div className="w-[200px] lg:w-[200px] 2xl:w-[280px]">
            <p className="truncate text-sm font-semibold text-foreground">{currentItem?.title ?? "No track selected"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {currentItem ? `${currentItem.artist} / ${currentItem.album}` : "Import a folder or switch online mode to start playback."}
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-xl flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={
                playback.playbackMode === "queue"
                  ? "Switch to shuffle playback"
                  : playback.playbackMode === "shuffle"
                    ? "Switch to repeat-one playback"
                    : "Switch to queue playback"
              }
              className={cn(
                "size-10 rounded-full",
                "text-foreground"
              )}
              onClick={togglePlaybackMode}
            >
              {playback.playbackMode === "queue" ? (
                <Repeat className="size-4" />
              ) : playback.playbackMode === "shuffle" ? (
                <Shuffle className="size-4" />
              ) : (
                <Repeat1 className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Previous track"
              className="size-10 rounded-full"
              onClick={() => void playPrevious()}
            >
              <SkipBack className="size-4" />
            </Button>
            <Button type="button" size="icon" aria-label="Toggle playback" className="size-12 rounded-full" onClick={() => void togglePlay()}>
              {playback.isPlaying ? <Pause className="size-5" /> : <Play className="size-5 fill-current" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Next track"
              className="size-10 rounded-full"
              onClick={() => void playNext()}
            >
              <SkipForward className="size-4" />
            </Button>
          </div>

          <div className="flex w-full items-center gap-3 text-[11px] text-muted-foreground">
            <small className="w-10 text-right">{formatDuration(playback.progressSeconds)}</small>
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
              className="flex-1"
            />
            <small className="w-10">{formatDuration(playback.durationSeconds)}</small>
          </div>
        </div>

        <div className="flex min-w-[240px] items-center justify-end gap-4">
          <VolumeControl
            className="hidden text-xs lg:flex"
            iconClassName="text-muted-foreground"
            buttonClassName="hover:text-foreground"
          />
          <button
            type="button"
            className={cn(
              "hidden items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground transition-colors md:flex",
              currentItem ? "hover:bg-accent/45 hover:text-foreground" : "cursor-not-allowed opacity-50",
              queueOpen && "bg-accent text-foreground"
            )}
            onClick={openQueueOverlay}
            disabled={!currentItem}
            aria-label="Open playing queue"
          >
            <ListMusic className="size-4" />
          </button>
        </div>
        </footer>
      </main>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-50 transition-opacity duration-300",
          isPlayerOverlayRoute ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!isPlayerOverlayRoute}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,16,0.18),rgba(5,7,16,0.7))] backdrop-blur-sm transition-opacity duration-300",
            isPlayerOverlayRoute ? "pointer-events-auto opacity-100" : "opacity-0"
          )}
          onClick={closePlayerOverlay}
          aria-label="Close now playing drawer"
        />

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 top-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isPlayerOverlayRoute ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex h-full flex-col justify-end p-0">
            <PlayerScene
              onClose={closePlayerOverlay}
              className="pointer-events-auto h-full min-h-0"
            />
          </div>
        </div>
      </div>

        <NowPlayingQueueDrawer />
      </div>
      <Toaster position="top-right" closeButton richColors />
    </>
  );
};
