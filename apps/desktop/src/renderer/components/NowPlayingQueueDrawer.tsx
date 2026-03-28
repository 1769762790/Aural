import { useEffect, useMemo, useState } from "react";
import { ListMusic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { extractCoverTheme, getFallbackCoverTheme } from "@renderer/lib/coverTheme";
import { formatDuration } from "@renderer/lib/formatters";
import { buildPlaylistCardArtwork } from "@renderer/lib/playlistArtwork";
import { toFileUrl } from "@renderer/lib/fileUrl";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const NowPlayingQueueDrawer = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queue = usePlayerStore((state) => state.queue);
  const trackMap = usePlayerStore((state) => state.trackMap);
  const playTracks = usePlayerStore((state) => state.playTracks);
  const queueOpen = usePlayerStore((state) => state.queueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const coverColorEnabled = usePreferencesStore((state) => state.snapshot["appearance.coverColor"] !== false);
  const [coverTheme, setCoverTheme] = useState(getFallbackCoverTheme);

  const coverUrl = currentTrack?.coverPath ? toFileUrl(currentTrack.coverPath) : null;
  const queueTracks = useMemo(
    () =>
      (queue?.items
        .map((item) => trackMap[item.trackId as unknown as string])
        .filter((track): track is NonNullable<typeof currentTrack> => Boolean(track)) ?? []),
    [currentTrack, queue?.items, trackMap]
  );

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
    return null;
  }

  return (
    <Drawer
      open={queueOpen}
      onOpenChange={setQueueOpen}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent
        className="inset-x-auto bottom-auto left-auto right-[10px] top-[15vh] mt-0 h-[70vh] w-[380px] max-w-[calc(100vw-20px)] rounded-[34px] border border-border p-0 shadow-[0_26px_80px_rgba(0,0,0,0.24)] after:!bg-transparent after:opacity-0 [&>div:first-child]:hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${coverTheme.primary} 18%, hsl(var(--card)) 82%) 0%, color-mix(in srgb, ${coverTheme.secondary} 14%, hsl(var(--card)) 86%) 100%)`
        }}
      >
        <div className="flex h-full flex-col p-5 pt-6">
          <DrawerHeader className="border-b border-border px-0 pb-4 pt-0 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Playing Queue</p>
                <DrawerTitle className="text-xl font-bold tracking-[-0.05em] text-foreground">
                  {queue?.items.length ?? 0} tracks
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Current playback queue
                </DrawerDescription>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setQueueOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </DrawerHeader>

          {queueTracks.length ? (
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {queueTracks.map((track, index) => {
                const isActive = track.id === currentTrack.id;

                return (
                  <button
                    key={`${track.id}-${index}`}
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-[24px] border px-3 py-3 text-left transition-all",
                      isActive
                        ? "border-primary/35 bg-accent/75"
                        : "border-border bg-background/38 hover:bg-accent/42"
                    )}
                    onClick={() => {
                      void playTracks(
                        queueTracks,
                        track.id,
                        queue?.items[index]?.sourceType ?? "library",
                        queue?.items[index]?.sourceId ?? "queue"
                      );
                    }}
                  >
                    <div className="flex w-7 shrink-0 justify-center text-xs font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div
                      className="size-12 shrink-0 rounded-[16px] border border-border bg-cover bg-center"
                      style={buildPlaylistCardArtwork(track.id, track.coverPath)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold", isActive ? "text-foreground" : "text-foreground/82")}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                    </div>
                    <div className="shrink-0 text-[11px] text-muted-foreground">{formatDuration(track.duration)}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground">
                <ListMusic className="size-6" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">Queue is empty</p>
                <p className="max-w-[240px] text-sm leading-6 text-muted-foreground">
                  Start playback from any song list and the current queue will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
