import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardChartTooltip } from "@/components/home/DashboardChartTooltip";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { songLengthData } from "@/components/home/home-data";

export const SongLengthChartCard = () => (
  <DashboardPanel title="Song Length" className="min-h-[320px]" contentClassName="h-full">
    <div className="h-[238px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...songLengthData]}
          layout="vertical"
          margin={{ top: 10, right: 26, left: 20, bottom: 4 }}
          barCategoryGap={24}
        >
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            content={
              <DashboardChartTooltip
                labelFormatter={(label) => `${label}`}
                valueFormatter={(value) => `${value}% of tracks`}
              />
            }
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
          />
          <YAxis
            dataKey="bucket"
            type="category"
            axisLine={false}
            tickLine={false}
            width={110}
            tick={({ x, y, payload }) => {
              const entry = songLengthData.find((item) => item.bucket === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text x={0} y={-3} fontSize="11" fill="var(--foreground)">
                    {payload.value}
                  </text>
                  <text x={0} y={12} fontSize="10" fill="var(--muted-foreground)">
                    {entry?.detail}
                  </text>
                </g>
              );
            }}
          />
          <Bar dataKey="value" radius={[999, 999, 999, 999]} fill="var(--primary)" background={{ fill: "var(--secondary)" }}>
            {songLengthData.map((item, index) => (
              <Cell key={item.bucket} fill="var(--primary)" fillOpacity={0.92 - index * 0.18} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </DashboardPanel>
);
