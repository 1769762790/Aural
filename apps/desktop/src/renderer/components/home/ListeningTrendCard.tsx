import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashboardChartTooltip } from "@/components/home/DashboardChartTooltip";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { listeningTrendRanges, listeningTrendSeries } from "@/components/home/home-data";
import { cn } from "@/lib/utils";

type TrendRange = (typeof listeningTrendRanges)[number];

export const ListeningTrendCard = () => {
  const [range, setRange] = useState<TrendRange>("7D");

  const series = [...listeningTrendSeries[range]];
  const peak = useMemo(() => series.reduce((max, item) => (item.hours > max.hours ? item : max), series[0]), [series]);

  return (
    <DashboardPanel
      title="Listening Duration Trends"
      headerRight={
        <div className="inline-flex rounded-full border border-border bg-background/65 p-1">
          {listeningTrendRanges.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] transition-colors",
                item === range
                  ? "bg-primary text-primary-foreground shadow-[0_10px_18px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      }
      className="min-h-[220px]"
    >
      <div className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ left: -10, right: 10, top: 24, bottom: 0 }}>
            <defs>
              <linearGradient id="listening-trend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.38} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 10" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis
              width={34}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value: number) => `${value.toFixed(0)}h`}
              domain={["dataMin - 0.6", "dataMax + 0.8"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.16, strokeDasharray: "4 8" }}
              content={<DashboardChartTooltip suffix=" hrs" />}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="var(--primary)"
              strokeWidth={4}
              fill="url(#listening-trend-fill)"
              activeDot={{ r: 7, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 3 }}
              dot={(props) =>
                props.payload?.label === peak.label ? (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill="var(--card)"
                    stroke="var(--primary)"
                    strokeWidth={3}
                  />
                ) : (
                  <circle cx={props.cx} cy={props.cy} r={0} fill="transparent" />
                )
              }
            >
              {range === "7D" ? (
                <LabelList
                  dataKey="hours"
                  content={(props) =>
                    props.value === peak.hours ? (
                      <g transform={`translate(${Number(props.x ?? 0)}, ${Number(props.y ?? 0) - 18})`}>
                        <rect width="58" height="24" rx="12" fill="var(--secondary)" />
                        <text
                          x="29"
                          y="16"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="var(--foreground)"
                        >
                          {`${peak.hours.toFixed(1)}h Peak`}
                        </text>
                      </g>
                    ) : null
                  }
                />
              ) : null}
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashboardPanel>
  );
};
