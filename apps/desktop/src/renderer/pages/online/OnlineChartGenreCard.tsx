import type { OnlineChartSummary } from "@aural/contracts";
import { Play } from "lucide-react";

interface OnlineChartGenreCardProps {
  chart: OnlineChartSummary;
  onOpen: (chartId: string) => void;
}

export const OnlineChartGenreCard = ({ chart, onOpen }: OnlineChartGenreCardProps) => {
  const lead = chart.preview[0] ?? null;
  const statLabel = chart.trackCount > 0 ? `${chart.trackCount}首` : chart.updateFrequency ?? "榜单";

  return (
    <button type="button" className="group flex flex-col gap-3 text-left" onClick={() => onOpen(chart.id)}>
      <div className="relative aspect-square overflow-hidden rounded-[14px] border border-border/60 bg-muted shadow-[0_18px_44px_rgba(15,23,42,0.14)] transition-transform duration-300 group-hover:-translate-y-1">
        {chart.coverUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${chart.coverUrl}")` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02)_48%,rgba(0,0,0,0.12))]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/22 text-white shadow-[0_8px_20px_rgba(255,255,255,0.16)] backdrop-blur-sm">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
            <span className="text-xs font-semibold text-white/88">{statLabel}</span>
          </div>

          <div className="pb-2">
          </div>
        </div>
      </div>

      <div className="space-y-1 px-0.5">
        <p className="line-clamp-1 text-[1.02rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          {chart.title}
        </p>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {lead ? `${lead.rank}. ${lead.title} · ${lead.artist}` : chart.subtitle}
        </p>
      </div>
    </button>
  );
};
