import type { ReactNode } from "react";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

interface DashboardChartTooltipProps extends TooltipProps<ValueType, NameType> {
  suffix?: string;
  labelFormatter?: (label: string | number) => ReactNode;
  valueFormatter?: (value: ValueType, name: NameType) => ReactNode;
}

export const DashboardChartTooltip = ({
  active,
  payload,
  label,
  suffix,
  labelFormatter,
  valueFormatter
}: DashboardChartTooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const value = item?.value;
  const name = item?.name;

  return (
    <div className="rounded-2xl border border-border bg-popover/95 px-3 py-2 shadow-[0_16px_42px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:shadow-[0_16px_42px_rgba(0,0,0,0.34)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {labelFormatter ? labelFormatter(label ?? "") : label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {valueFormatter ? valueFormatter(value ?? "", name ?? "") : `${value ?? ""}${suffix ?? ""}`}
      </p>
    </div>
  );
};
