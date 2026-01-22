import { flexRender, type Row, type Table as TableType } from '@tanstack/react-table';
import { cn } from '@/shared/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

interface DataTableProps<TData> {
  table: TableType<TData>;
  onRowClick?: (row: Row<TData>) => void;
  getRowClassName?: (row: Row<TData>) => string;
  emptyState?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  onRowClick,
  getRowClassName,
  emptyState,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const colSpan = Math.max(1, table.getVisibleLeafColumns().length);

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className={cn((header.column.columnDef.meta as { headerClassName?: string } | undefined)?.headerClassName)}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center text-sm text-muted-foreground">
              {emptyState ?? 'No results.'}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(getRowClassName?.(row))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn((cell.column.columnDef.meta as { cellClassName?: string } | undefined)?.cellClassName)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}




