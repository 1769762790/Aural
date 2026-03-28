import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardChartTooltip } from "@/components/home/DashboardChartTooltip";
import { listeningMetrics } from "@/components/home/home-data";

export const InsightMetricStack = () => (
  <div className="space-y-4">
    {listeningMetrics.map((metric) => (
      <Card
        key={metric.label}
        className="overflow-hidden rounded-[24px] border-border bg-card/84 shadow-[0_16px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
      >
        <CardContent className="flex items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{metric.label}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <span className="text-2xl font-black tracking-[-0.06em] text-foreground">{metric.value}</span>
              <span className="text-base font-bold text-primary">{metric.accent}</span>
            </div>
          </div>

          <div className="h-12 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metric.trend.map((value, index) => ({ index, value }))}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <Tooltip
                  cursor={false}
                  content={
                    <DashboardChartTooltip
                      labelFormatter={(label) => `Point ${Number(label) + 1}`}
                      valueFormatter={(value) => `${value}`}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="var(--primary)"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);
