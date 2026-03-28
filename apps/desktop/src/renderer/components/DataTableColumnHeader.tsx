"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const direction = column.getIsSorted();

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "-ml-3 h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground hover:bg-accent/45 hover:text-foreground",
        className
      )}
      onClick={() => column.toggleSorting(direction === "asc")}
    >
      <span>{title}</span>
      {direction === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : direction === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-70" />
      )}
    </Button>
  );
}
