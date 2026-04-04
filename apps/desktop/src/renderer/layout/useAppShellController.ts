import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { BrowseMode } from "@aural/domain";
import { formatDuration } from "@renderer/lib/formatters";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { persistSetting } from "@renderer/lib/settingsPersistence";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

export const useAppShellController = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastNonPlayerRouteRef = useRef("/songs");
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
  const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
  const browseModePreference = usePreferencesStore((state) => state.snapshot["online.lastMode"]);
  const layoutModeValue = usePreferencesStore((state) => state.snapshot["appearance.layout"]);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  const isPlayerOverlayRoute = location.pathname === "/player";
  const isOnlineRoute = location.pathname.startsWith("/online");
  const browseMode: BrowseMode = isOnlineRoute ? "online" : browseModePreference === "online" ? "online" : "local";
  const layoutMode: "vertical" | "horizontal" = layoutModeValue === "horizontal" ? "horizontal" : "vertical";
  const isDark = resolvedTheme === "dark";
  const coverUrl = resolvePlayableCoverUrl(currentItem);
  const coverStyle = coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined;

  useEffect(() => {
    if (location.pathname === "/player") {
      return;
    }

    const route = `${location.pathname}${location.search}${location.hash}`;
    lastNonPlayerRouteRef.current = route || "/songs";
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

  return {
    browseMode,
    closePlayerOverlay,
    coverStyle,
    currentItem,
    formatDuration,
    isDark,
    isPlayerOverlayRoute,
    layoutMode,
    openPlayerOverlay,
    openQueueOverlay,
    playback,
    playNext,
    playPrevious,
    queueOpen,
    scrollContainerRef,
    scrollbarWidth,
    seekTo,
    togglePlay,
    togglePlaybackMode,
    toggleThemeMode
  };
};
