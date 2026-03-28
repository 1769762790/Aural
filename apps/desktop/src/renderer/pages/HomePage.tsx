import { AnnualGoalCard } from "@/components/home/AnnualGoalCard";
import { AudioQualityChartCard } from "@/components/home/AudioQualityChartCard";
import { DashboardSectionHeader } from "@/components/home/DashboardSectionHeader";
import { InsightMetricStack } from "@/components/home/InsightMetricStack";
import { ListeningHeatmapCard } from "@/components/home/ListeningHeatmapCard";
import { ListeningTrendCard } from "@/components/home/ListeningTrendCard";
import { MusicEraChartCard } from "@/components/home/MusicEraChartCard";
import { SongLengthChartCard } from "@/components/home/SongLengthChartCard";

export const HomePage = () => (
  <div className="space-y-10 pb-8">
    <section className="space-y-6">
      <DashboardSectionHeader eyebrow="" title="" />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ListeningHeatmapCard />
          <ListeningTrendCard />
        </div>

        <div className="space-y-4 xl:col-span-1">
          <AnnualGoalCard />
          <InsightMetricStack />
        </div>
      </div>
    </section>

    <section className="space-y-6">
      <DashboardSectionHeader eyebrow="" title="" />

      <div className="grid gap-6 xl:grid-cols-3">
        <AudioQualityChartCard />
        <MusicEraChartCard />
        <SongLengthChartCard />
      </div>
    </section>
  </div>
);
