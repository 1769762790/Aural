import { cloneElement, useMemo, useRef, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { listeningHeatmap } from "@/components/home/home-data";

interface HeatmapValue {
  date: string;
  count: number;
  hours: number;
  [key: string]: unknown;
}

export const ListeningHeatmapCard = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    left: number;
    top: number;
    date: string;
    hours: number;
  } | null>(null);

  const { startDate, endDate, values } = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const start = new Date(end);
    start.setDate(end.getDate() - 48);

    const mappedValues: HeatmapValue[] = listeningHeatmap.flatMap((week, weekIndex) =>
      week.map((value, dayIndex) => {
        const date = new Date(start);
        date.setDate(start.getDate() + weekIndex * 7 + dayIndex);

        return {
          date: date.toISOString().slice(0, 10),
          count: Math.max(1, Math.min(4, Math.ceil(value * 4))),
          hours: Number((value * 10).toFixed(1))
        };
      })
    );

    return {
      startDate: start,
      endDate: end,
      values: mappedValues
    };
  }, []);

  return (
    <DashboardPanel
      title="Listening Density"
      headerRight={
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <span>Less</span>
          <div className="flex items-center gap-1.5">
            {[0.18, 0.34, 0.56, 0.82].map((opacity) => (
              <span key={opacity} className="block size-3 rounded-[4px] bg-primary" style={{ opacity }} />
            ))}
          </div>
          <span>More</span>
        </div>
      }
      className="min-h-[410px]"
      contentClassName="pt-2"
    >
      <div ref={wrapperRef} className="relative">
        <div className="max-w-[520px]">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={values}
            gutterSize={6}
            showMonthLabels={false}
            showWeekdayLabels
            titleForValue={(value) => (value ? `${value.date}: ${value.hours} hours` : "No listening")}
            onMouseOver={(event, value) => {
              if (!value || !wrapperRef.current) {
                return;
              }

              const bounds = event.currentTarget.getBoundingClientRect();
              const parentBounds = wrapperRef.current.getBoundingClientRect();

              setHoveredCell({
                left: bounds.left - parentBounds.left + bounds.width / 2,
                top: bounds.top - parentBounds.top - 8,
                date: value.date,
                hours: value.hours
              });
            }}
            onMouseLeave={() => setHoveredCell(null)}
            transformDayElement={(element, value) => {
              const level = value?.count ?? 0;
              const opacity = [0.12, 0.28, 0.44, 0.62, 0.82][level] ?? 0.12;

              return cloneElement(element, {
                rx: 6,
                ry: 6,
                style: {
                  fill: "var(--primary)",
                  opacity,
                  stroke: "var(--border)",
                  strokeWidth: 1
                }
              });
            }}
            className="aural-heatmap"
          />
        </div>

        {hoveredCell ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-2xl border border-border bg-popover/95 px-3 py-2 shadow-[0_16px_42px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:shadow-[0_16px_42px_rgba(0,0,0,0.34)]"
            style={{ left: hoveredCell.left, top: hoveredCell.top }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {hoveredCell.date}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{hoveredCell.hours.toFixed(1)} hrs listening density</p>
          </div>
        ) : null}
      </div>
    </DashboardPanel>
  );
};
