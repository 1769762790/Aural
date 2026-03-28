import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { DashboardChartTooltip } from "@/components/home/DashboardChartTooltip";
import { annualGoal } from "@/components/home/home-data";

export const AnnualGoalCard = () => (
  <DashboardPanel title="Annual Goal" className="min-h-[290px]" contentClassName="flex h-full flex-col justify-between gap-6">
    <div className="relative mx-auto h-[168px] w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ value: annualGoal.progress }]}
          startAngle={90}
          endAngle={-270}
          innerRadius="72%"
          outerRadius="100%"
          barSize={12}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            cursor={false}
            content={
              <DashboardChartTooltip
                labelFormatter={() => "Annual goal"}
                valueFormatter={(value) => `${value}% complete`}
              />
            }
          />
          <RadialBar
            dataKey="value"
            cornerRadius={999}
            fill="var(--primary)"
            fillOpacity={0.96}
            background={{ fill: "var(--secondary)", fillOpacity: 1 }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tracking-[-0.08em] text-foreground">{annualGoal.progress}%</span>
        <span className="text-sm text-muted-foreground">
          {annualGoal.currentHours}/{annualGoal.targetHours} hrs
        </span>
      </div>
    </div>

    <p className="mx-auto max-w-[220px] text-center text-sm leading-6 text-muted-foreground">
      "{annualGoal.note}"
    </p>
  </DashboardPanel>
);
