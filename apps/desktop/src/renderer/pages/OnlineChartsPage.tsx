import { useNavigate } from "react-router-dom";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { OnlineChartGenreCard } from "./online/OnlineChartGenreCard";
import { OnlineChartHeroCard } from "./online/OnlineChartHeroCard";

export const OnlineChartsPage = () => {
  const navigate = useNavigate();
  const overview = useAsyncResource(() => bridge.online.getChartsOverview(), [], "online:charts:overview");

  const openChart = (chartId: string) => {
    void navigate(`/online/playlists/${chartId}`);
  };

  return (
    <div className="space-y-10 px-2 py-2 text-foreground">
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-[2rem] font-black tracking-[-0.06em] text-foreground">Core Rankings</h2>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">The heartbeat of VibeMusic&apos;s global discovery.</p>
        </div>

        {overview.isLoading && !overview.data ? (
          <div className="grid gap-5 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`chart-core-skeleton-${index}`} className="min-h-[310px] animate-pulse rounded-[30px] bg-muted/70" />
            ))}
          </div>
        ) : overview.data?.core.length ? (
          <div className="grid gap-5 xl:grid-cols-4">
            {overview.data.core.map((chart, index) => (
              <OnlineChartHeroCard key={chart.id} chart={chart} index={index} onOpen={openChart} />
            ))}
          </div>
        ) : (
          <div className="rounded-[30px] border border-border bg-background/68 px-6 py-10 text-sm text-muted-foreground">
            No chart data is available right now.
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-[2rem] font-black tracking-[-0.06em] text-foreground">Global & Genre Charts</h2>
          </div>
        </div>

        {overview.isLoading && !overview.data ? (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`chart-genre-skeleton-${index}`} className="min-h-[180px] animate-pulse rounded-[26px] bg-muted/70" />
            ))}
          </div>
          ) : overview.data?.genre.length ? (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8">
            {overview.data.genre.map((chart) => (
              <OnlineChartGenreCard key={chart.id} chart={chart} onOpen={openChart} />
            ))}
            </div>
          ) : (
          <div className="rounded-[26px] border border-border bg-background/68 px-6 py-8 text-sm text-muted-foreground">
            No specialized charts are available right now.
          </div>
        )}
      </section>
    </div>
  );
};
