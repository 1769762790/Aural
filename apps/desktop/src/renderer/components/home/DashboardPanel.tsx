import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const DashboardPanel = ({
  title,
  headerRight,
  children,
  className,
  contentClassName
}: DashboardPanelProps) => (
  <Card
    className={cn(
      "overflow-hidden rounded-[28px] border-border bg-card/84 shadow-[0_20px_56px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:bg-card/88 dark:shadow-[0_24px_72px_rgba(0,0,0,0.26)]",
      className
    )}
  >
    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-5 pb-3 md:p-6 md:pb-4">
      <CardTitle className="text-[1.35rem] font-bold tracking-[-0.05em] text-foreground">{title}</CardTitle>
      {headerRight}
    </CardHeader>
    <CardContent className={cn("p-5 pt-0 md:p-6 md:pt-0", contentClassName)}>{children}</CardContent>
  </Card>
);
