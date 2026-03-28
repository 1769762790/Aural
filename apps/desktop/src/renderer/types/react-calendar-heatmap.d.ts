declare module "react-calendar-heatmap" {
  import type { MouseEvent as ReactMouseEvent, ReactElement, SVGProps } from "react";

  export interface CalendarHeatmapValue {
    date: string | Date | number;
    count?: number;
    [key: string]: unknown;
  }

  export interface CalendarHeatmapProps<TValue extends CalendarHeatmapValue = CalendarHeatmapValue> {
    values: TValue[];
    startDate?: string | Date | number;
    endDate?: string | Date | number;
    numDays?: number;
    horizontal?: boolean;
    gutterSize?: number;
    showMonthLabels?: boolean;
    showWeekdayLabels?: boolean;
    showOutOfRangeDays?: boolean;
    monthLabels?: string[];
    weekdayLabels?: string[];
    className?: string;
    classForValue?: (value: TValue | null) => string;
    titleForValue?: (value: TValue | null) => string | null | undefined;
    tooltipDataAttrs?: Record<string, string> | ((value: TValue | null) => Record<string, string>);
    onClick?: (value: TValue | null) => void;
    onMouseOver?: (event: ReactMouseEvent<SVGRectElement>, value: TValue | null) => void;
    onMouseLeave?: (event: ReactMouseEvent<SVGRectElement>, value: TValue | null) => void;
    transformDayElement?: (
      element: ReactElement<SVGProps<SVGRectElement>>,
      value: TValue | null,
      index: number
    ) => ReactElement;
  }

  function CalendarHeatmap<TValue extends CalendarHeatmapValue = CalendarHeatmapValue>(
    props: CalendarHeatmapProps<TValue>
  ): ReactElement | null;
  export default CalendarHeatmap;
}
