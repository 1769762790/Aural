import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardChartTooltip } from "@/components/home/DashboardChartTooltip";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { audioQualityData } from "@/components/home/home-data";

const SEGMENT_OPACITY = [1, 0.72, 0.42];

export const AudioQualityChartCard = () => (
  <DashboardPanel title="Audio Quality" className="min-h-[320px]" contentClassName="flex h-full flex-col justify-between gap-6">
    <div className="mx-auto h-[180px] w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={
              <DashboardChartTooltip
                valueFormatter={(value, name) => `${name}: ${value}%`}
                labelFormatter={() => "Audio quality"}
              />
            }
          />
          <Pie
            data={[...audioQualityData]}
            dataKey="value"
            nameKey="name"
            innerRadius="72%"
            outerRadius="94%"
            paddingAngle={2}
            stroke="transparent"
          >
            {audioQualityData.map((entry, index) => (
              <Cell key={entry.name} fill="var(--primary)" fillOpacity={SEGMENT_OPACITY[index] ?? 0.3} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>

    <div className="space-y-3">
      {audioQualityData.map((entry, index) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span
              className="size-2.5 rounded-full bg-primary"
              style={{ opacity: SEGMENT_OPACITY[index] ?? 0.3 }}
            />
            <span>{entry.name}</span>
          </div>
          <span className="font-semibold text-foreground">{entry.value}%</span>
        </div>
      ))}
    </div>
  </DashboardPanel>
);
