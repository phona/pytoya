import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  type ColumnDef,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { CheckCircle2, ChevronDown, ChevronUp, Eye, XCircle } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { DataTable } from '@/shared/components/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ProgressBar } from './ProgressBar';

interface ManifestTableProps {
  manifests: Manifest[];
  sort: { field: string; order: 'asc' | 'desc' };
  onSortChange: (sort: { field: string; order: 'asc' | 'desc' }) => void;
  onSelectManifest: (manifestId: number) => void;
  selectedIds?: Set<number>;
  onSelectToggle?: (id: number) => void;
  onSelectAll?: () => void;
  selectAll?: boolean;
  manifestProgress?: Record<number, { progress: number; status: string; error?: string }>;
}

export function ManifestTable({
  manifests,
  sort,
  onSortChange,
  onSelectManifest,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  selectAll,
  manifestProgress,
}: ManifestTableProps) {
  const sorting = useMemo<SortingState>(
    () => (sort.field ? [{ id: sort.field, desc: sort.order === 'desc' }] : []),
    [sort],
  );

  const handleSort = useCallback((field: string) => {
    if (sort.field === field) {
      onSortChange({ field, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field, order: 'asc' });
    }
  }, [onSortChange, sort.field, sort.order]);

  const renderSortIcon = useCallback((field: string) => {
    if (sort.field !== field) return null;
    return sort.order === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  }, [sort.field, sort.order]);

  const columns = useMemo<ColumnDef<Manifest>[]>(() => {
    const cols: ColumnDef<Manifest>[] = [];

    if (onSelectAll && onSelectToggle) {
      cols.push({
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectAll ?? false}
              onCheckedChange={() => onSelectAll()}
              aria-label="Select all manifests"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectedIds?.has(row.original.id) ?? false}
              onCheckedChange={() => onSelectToggle(row.original.id)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Select ${row.original.originalFilename}`}
            />
          </div>
        ),
        meta: {
          headerClassName: 'w-12',
          cellClassName: 'w-12',
        },
      });
    }

    cols.push(
      {
        id: 'filename',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('filename')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            Filename
            {renderSortIcon('filename')}
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-sm font-medium text-gray-900">
            {row.original.originalFilename}
          </div>
        ),
      },
      {
        id: 'status',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('status')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            Status
            {renderSortIcon('status')}
          </button>
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          const statusClass =
            status === 'completed'
              ? 'bg-green-100 text-green-700'
              : status === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : status === 'processing'
              ? 'bg-blue-100 text-blue-700'
              : status === 'failed'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700';

          return (
            <Badge className={`px-2 py-1 ${statusClass}`}>{status}</Badge>
          );
        },
      },
      {
        id: 'progress',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Progress
          </span>
        ),
        cell: ({ row }) => {
          const progress = manifestProgress?.[row.original.id];
          return row.original.status === 'processing' || progress ? (
            <div className="w-32">
              <ProgressBar
                progress={progress?.progress ?? 0}
                status={progress?.status}
                error={progress?.error}
                size="sm"
                showLabel={false}
                showStatus={false}
              />
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          );
        },
      },
      {
        id: 'poNo',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('poNo')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            PO No
            {renderSortIcon('poNo')}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.purchaseOrder ?? 'N/A'}
          </span>
        ),
      },
      {
        id: 'invoiceDate',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('invoiceDate')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            Invoice Date
            {renderSortIcon('invoiceDate')}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.invoiceDate
              ? format(new Date(row.original.invoiceDate), 'PP')
              : 'N/A'}
          </span>
        ),
      },
      {
        id: 'department',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Department
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.department ?? 'N/A'}
          </span>
        ),
      },
      {
        id: 'confidence',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('confidence')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            Confidence
            {renderSortIcon('confidence')}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.confidence !== null
              ? `${Math.round(row.original.confidence * 100)}%`
              : 'N/A'}
          </span>
        ),
      },
      {
        id: 'verified',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Verified
          </span>
        ),
        cell: ({ row }) => (
          row.original.humanVerified ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-300" />
          )
        ),
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'actions',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onSelectManifest(row.original.id);
            }}
            className="text-indigo-600 hover:text-indigo-900"
          >
            <Eye className="mr-1 h-4 w-4" />
            View
          </Button>
        ),
        meta: {
          cellClassName: 'text-right',
          headerClassName: 'text-right',
        },
      },
    );

    return cols;
  }, [
    handleSort,
    manifestProgress,
    onSelectAll,
    onSelectManifest,
    onSelectToggle,
    renderSortIcon,
    selectedIds,
    selectAll,
  ]);

  const table = useReactTable({
    data: manifests,
    columns,
    state: { sorting },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'border-gray-300';
    if (confidence >= 0.9) return 'border-green-500';
    if (confidence >= 0.7) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className="overflow-x-auto">
      <DataTable
        table={table}
        onRowClick={(row) => onSelectManifest(row.original.id)}
        getRowClassName={(row) =>
          `hover:bg-gray-50 cursor-pointer border-l-4 ${getConfidenceColor(row.original.confidence)}`
        }
      />
    </div>
  );
}
