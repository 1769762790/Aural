import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardChartTooltip } from "@/components/home/DashboardChartTooltip";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { musicEraData } from "@/components/home/home-data";

export const MusicEraChartCard = () => (
  <DashboardPanel title="Music Era Distribution" className="min-h-[320px]" contentClassName="flex h-full flex-col justify-between gap-5">
    <div className="h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...musicEraData]} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            content={
              <DashboardChartTooltip
                labelFormatter={(label) => `${label}`}
                valueFormatter={(value) => `${value} albums`}
              />
            }
          />
          <XAxis
            dataKey="era"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            width={28}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Bar dataKey="count" radius={[999, 999, 0, 0]}>
            {musicEraData.map((item, index) => (
              <Cell key={item.era} fill="var(--primary)" fillOpacity={0.28 + index * 0.14} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <p className="text-center text-sm text-muted-foreground">Dominant era: 2020 - Present</p>
  </DashboardPanel>
);
