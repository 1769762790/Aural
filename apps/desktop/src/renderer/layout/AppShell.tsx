import { Toaster } from "@/components/ui/sonner";
import { AppRuntimeBridge } from "@renderer/components/AppRuntimeBridge";
import { NowPlayingQueueDrawer } from "@renderer/components/NowPlayingQueueDrawer";
import { PlayerAudioBridge } from "@renderer/components/PlayerAudioBridge";
import { AppHeader } from "./components/AppHeader";
import { AppMainContent } from "./components/AppMainContent";
import { AppSidebar } from "./components/AppSidebar";
import { FloatingPlayerDock } from "./components/FloatingPlayerDock";
import { PlayerOverlay } from "./components/PlayerOverlay";
import { useAppShellController } from "./useAppShellController";

export const AppShell = () => {
  const shell = useAppShellController();

  return (
    <>
      <div
        className="relative grid h-screen w-screen overflow-hidden bg-background text-foreground"
        style={{ gridTemplateColumns: shell.layoutMode === "vertical" ? "220px minmax(0,1fr)" : "minmax(0,1fr)" }}
      >
        <AppRuntimeBridge />
        <PlayerAudioBridge />
        {shell.layoutMode === "vertical" ? <AppSidebar browseMode={shell.browseMode} /> : null}

        <main className="relative flex min-h-0 flex-col overflow-hidden">
          <AppHeader
            browseMode={shell.browseMode}
            isDark={shell.isDark}
            layoutMode={shell.layoutMode}
            onToggleTheme={shell.toggleThemeMode}
          />
          <AppMainContent scrollContainerRef={shell.scrollContainerRef} layoutMode={shell.layoutMode} />
          <FloatingPlayerDock
            coverStyle={shell.coverStyle}
            currentItem={shell.currentItem}
            formatDuration={shell.formatDuration}
            onNext={() => void shell.playNext()}
            onOpenPlayer={shell.openPlayerOverlay}
            onOpenQueue={shell.openQueueOverlay}
            onPrevious={() => void shell.playPrevious()}
            onSeek={shell.seekTo}
            onTogglePlay={() => void shell.togglePlay()}
            onTogglePlaybackMode={shell.togglePlaybackMode}
            playback={shell.playback}
            queueOpen={shell.queueOpen}
            scrollbarWidth={shell.scrollbarWidth}
          />
        </main>

        <PlayerOverlay isOpen={shell.isPlayerOverlayRoute} onClose={shell.closePlayerOverlay} />
        <NowPlayingQueueDrawer />
      </div>
      <Toaster position="top-right" closeButton richColors />
    </>
  );
};
