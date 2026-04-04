"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type TableOptions,
  type VisibilityState
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  tableClassName?: string;
  initialSorting?: SortingState;
  columnVisibility?: VisibilityState;
  getRowId?: TableOptions<TData>["getRowId"];
  onRowClick?: (row: Row<TData>) => void;
  onRowDoubleClick?: (row: Row<TData>) => void;
  rowClassName?: string | ((row: Row<TData>) => string | undefined);
  renderRowContextMenu?: (row: Row<TData>) => ReactNode;
}

interface DataTableColumnMeta {
  headerClassName?: string;
  cellClassName?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyTitle = "No results",
  emptyDescription = "There is nothing to show here yet.",
  loading = false,
  toolbar,
  footer,
  className,
  tableClassName,
  initialSorting = [],
  columnVisibility,
  getRowId,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  renderRowContextMenu
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(columnVisibility ? { columnVisibility } : {})
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId
  });

  const rows = table.getRowModel().rows;

  const resolvedRowClassName = useMemo(
    () => (row: Row<TData>) => {
      const computed = typeof rowClassName === "function" ? rowClassName(row) : rowClassName;
      return cn("border-border/70 transition-colors", (onRowClick || onRowDoubleClick) && "cursor-pointer", computed);
    },
    [onRowClick, onRowDoubleClick, rowClassName]
  );

  return (
    <Card className={cn("overflow-hidden rounded-[28px] border-border bg-card/78", className)}>
      {toolbar ? <div className="border-b border-border px-6 py-4">{toolbar}</div> : null}

      <Table className={cn("w-full table-fixed", tableClassName)}>
        <TableHeader className="bg-background/45">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border/70 hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-12 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground",
                      meta?.headerClassName
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-28 px-6 text-center text-sm text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((row) => {
              const rowContextMenu = renderRowContextMenu?.(row);
              const tableRow = (
                <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn("group", resolvedRowClassName(row))}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

                  return (
                    <TableCell key={cell.id} className={cn("px-6 py-4 align-middle", meta?.cellClassName)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
              )
              if (rowContextMenu) {
                return (
                  <ContextMenu key={row.id}>
                    <ContextMenuTrigger asChild>
                      {tableRow}
                    </ContextMenuTrigger>
                    {rowContextMenu}
                  </ContextMenu>
                )
              }
              return tableRow;
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="px-6 py-14 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">{emptyTitle}</p>
                  <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {footer ? <div className="border-t border-border px-6 py-4">{footer}</div> : null}
    </Card>
  );
}
