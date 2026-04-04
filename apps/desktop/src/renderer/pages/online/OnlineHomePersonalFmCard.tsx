import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipForward, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bridge } from "@renderer/lib/bridge";
import { extractCoverTheme, getFallbackCoverTheme } from "@renderer/lib/coverTheme";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { usePlayerStore } from "@renderer/stores/playerStore";

const PERSONAL_FM_CACHE_KEY = "online:home:personal-fm";

export const OnlineHomePersonalFmCard = () => {
  const personalFm = useAsyncResource(() => bridge.online.getPersonalFmTracks(), [], PERSONAL_FM_CACHE_KEY);
  const playItems = usePlayerStore((state) => state.playItems);
  const currentPlayerItem = usePlayerStore((state) => state.currentItem);
  const isPlaying = usePlayerStore((state) => state.playback.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const [cursor, setCursor] = useState(0);
  const [coverTheme, setCoverTheme] = useState(() => getFallbackCoverTheme());

  const items = personalFm.data ?? [];
  const currentItem = items[cursor] ?? null;
  const coverUrl = resolvePlayableCoverUrl(currentItem);
  const remainingQueue = useMemo(() => items.slice(cursor), [items, cursor]);
  const isActiveFm = currentPlayerItem?.id === currentItem?.id;
  const isPlayingFm = isActiveFm && isPlaying;

  useEffect(() => {
    setCursor(0);
  }, [personalFm.data]);

  useEffect(() => {
    let cancelled = false;

    if (!coverUrl) {
      setCoverTheme(getFallbackCoverTheme());
      return () => {
        cancelled = true;
      };
    }

    void extractCoverTheme(coverUrl)
      .then((theme) => {
        if (!cancelled) {
          setCoverTheme(theme);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoverTheme(getFallbackCoverTheme());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  const playFromCursor = async (startIndex = cursor) => {
    const queue = items.slice(startIndex);
    const startItem = queue[0] ?? null;
    if (!queue.length || !startItem) {
      return;
    }

    await playItems(queue, startItem.id, "online", "personal-fm");
  };

  const moveToNext = async () => {
    if (cursor < items.length - 1) {
      const nextIndex = cursor + 1;
      const nextItem = items[nextIndex] ?? null;
      setCursor(nextIndex);

      if (isActiveFm && nextItem) {
        await playFromCursor(nextIndex);
      }
      return;
    }

    await personalFm.refresh();
  };

  const trashCurrent = async () => {
    if (!currentItem) {
      return;
    }

    const trashed = await bridge.online.trashPersonalFmTrack(currentItem.id).catch(() => false);
    if (!trashed) {
      return;
    }

    await moveToNext();
  };

  return (
    <section
      className="group relative h-[200px] overflow-hidden rounded-[26px] border border-border/70 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.14)]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 82% 22%, ${coverTheme.glowPrimary} 0%, transparent 28%),
          radial-gradient(circle at 16% 86%, ${coverTheme.glowSecondary} 0%, transparent 24%),
          linear-gradient(135deg, ${coverTheme.primary} 0%, ${coverTheme.secondary} 100%)
        `
      }}
    >
      {coverUrl ? (
        <div
          className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-3xl"
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0) 36%),
            linear-gradient(135deg, ${coverTheme.overlay} 0%, rgba(0,0,0,0) 68%)
          `
        }}
      />

      <div className="relative z-10 flex h-full gap-5">
        <div className="relative h-[164px] w-[164px] shrink-0 overflow-hidden rounded-[18px] bg-black/18">
          {personalFm.isLoading ? <div className="h-full w-full animate-pulse bg-white/10" /> : null}
          {!personalFm.isLoading && coverUrl ? (
            <img src={coverUrl} alt={currentItem?.title ?? "Personal FM cover"} className="h-full w-full object-cover" />
          ) : null}
          {!personalFm.isLoading && !coverUrl ? (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(42,15,48,0.86),rgba(107,42,95,0.72),rgba(245,112,190,0.42))]" />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-1 text-white">
          <div className="space-y-2">
            <div className="space-y-1">
              <h3 className="truncate text-[clamp(1.8rem,2.8vw,2.6rem)] font-black leading-[0.95] tracking-[-0.07em] text-white">
                {currentItem?.title ?? "私人 FM"}
              </h3>
              <p className="text-lg font-semibold text-white/80">{currentItem?.artist ?? "根据你的听歌偏好生成"}</p>
            </div>
            {personalFm.error ? (
              <p className="text-sm text-white/72">私人 FM 暂时不可用，请确认账号已登录后重试。</p>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-2 text-white">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-10 rounded-full bg-transparent text-white/90 hover:bg-white/12 hover:text-white disabled:opacity-50"
                disabled={!currentItem || personalFm.isLoading}
                onClick={() => {
                  void trashCurrent();
                }}
              >
                <ThumbsDown className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-12 rounded-full border border-white/12 text-white backdrop-blur-md transition-all disabled:opacity-50 data-[state=active]:border-white/22 data-[state=active]:bg-white/24 data-[state=active]:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.16)]"
                data-state={isActiveFm ? "active" : "idle"}
                disabled={!currentItem || personalFm.isLoading}
                onClick={() => {
                  if (isActiveFm) {
                    void togglePlay();
                    return;
                  }

                  void playFromCursor();
                }}
              >
                {isPlayingFm ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-10 rounded-full bg-transparent text-white/90 hover:bg-white/12 hover:text-white disabled:opacity-50"
                disabled={!currentItem || personalFm.isLoading}
                onClick={() => {
                  void moveToNext();
                }}
              >
                <SkipForward className="size-4" />
              </Button>
            </div>

            <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">
              私人 FM
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
