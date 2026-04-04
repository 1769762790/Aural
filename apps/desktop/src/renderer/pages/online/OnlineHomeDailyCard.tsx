import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { usePlayerStore } from "@renderer/stores/playerStore";

const DAILY_RECOMMENDATION_CACHE_KEY = "online:home:daily-recommended-songs";

export const OnlineHomeDailyCard = () => {
  const navigate = useNavigate();
  const playItems = usePlayerStore((state) => state.playItems);
  const dailyRecommendations = useAsyncResource(
    () => bridge.online.getDailyRecommendedSongs(),
    [],
    DAILY_RECOMMENDATION_CACHE_KEY
  );

  const items = dailyRecommendations.data ?? [];
  const firstTrack = items[0] ?? null;
  const coverUrl = resolvePlayableCoverUrl(firstTrack);

  const openDailySongs = () => {
    if (!items.length && !dailyRecommendations.error) {
      return;
    }

    void navigate("/online/daily-songs");
  };

  const playDailySongs = async () => {
    if (!items.length) {
      return;
    }

    await playItems(items, items[0]?.id, "playlist", "online-home:daily-songs");
  };

  return (
    <section
      className="group relative h-[200px] overflow-hidden rounded-[26px] border border-border/70 bg-[#090909] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)] bg-animate"
      style={coverUrl ? { backgroundImage: `url("${coverUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      onClick={openDailySongs}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(8,8,10,0.94)_0%,rgba(8,8,10,0.8)_38%,rgba(8,8,10,0.46)_72%,rgba(8,8,10,0.86)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(126,95,255,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)_24%)]" />

      <div className="relative z-10 flex h-full items-center justify-between">
        <div className="max-w-full space-y-4">
          <h2 className="text-6xl font-black leading-[0.88] tracking-[-0.08em] text-white">每日推荐</h2>
          <div className="space-y-1 text-white/72">
            {dailyRecommendations.error ? (
              <p className="text-sm">每日推荐暂时不可用，请确认账号已登录后重试。</p>
            ) : firstTrack ? (
              <p className="text-sm">
                {firstTrack.title} · {firstTrack.artist}
              </p>
            ) : (
              <p className="text-sm">Fresh picks curated for your current listening mood.</p>
            )}
          </div>
        </div>
          <Button
            type="button"
            size="icon"
            disabled={!items.length || dailyRecommendations.isLoading}
            className="size-12 rounded-full border border-white/10 bg-white/12 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-[1.04] hover:bg-white/18 disabled:cursor-default disabled:opacity-45"
            onClick={(event) => {
              event.stopPropagation();
              void playDailySongs();
            }}
          >
            <Play className="ml-0.5 size-4 fill-current" />
          </Button>
      </div>
    </section>
  );
};
