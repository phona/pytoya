import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  type ColumnDef,
  getCoreRowModel,
  type VisibilityState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';
import { ProgressBar } from './ProgressBar';
import { ManifestActionsMenu } from './ManifestActionsMenu';
import { useI18n } from '@/shared/providers/I18nProvider';

export type ManifestTableSchemaColumn = {
  path: string;
  title?: string;
  type?: 'string' | 'number' | 'integer' | 'boolean';
  format?: string;
};

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
  onPreviewOcr?: (manifestId: number) => void;
  schemaColumns?: ManifestTableSchemaColumn[];
  schemaColumnFilters?: Record<string, string>;
  onSchemaColumnFilterChange?: (fieldPath: string, value: string) => void;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const formatSchemaColumnLabel = (path: string): string => {
  const leaf = path.split('.').filter(Boolean).pop() ?? path;
  const cleaned = leaf.replace(/_/g, ' ').trim();
  if (!cleaned) return path;
  return cleaned
    .split(/\s+/g)
    .map((part) => (part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
};

const getByDotPath = (value: unknown, path: string): unknown => {
  if (!isRecord(value) || !path) {
    return undefined;
  }
  const parts = path.split('.').filter(Boolean);
  let current: unknown = value;
  for (const part of parts) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
};

const formatSchemaCellValue = (
  value: unknown,
  column: ManifestTableSchemaColumn,
  naLabel: string,
) => {
  if (value === null || value === undefined) {
    return naLabel;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return naLabel;
    }
    if (column.format === 'date' || column.format === 'date-time') {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'PP');
      }
    }
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return naLabel;
};

const formatSchemaCellValueForFilter = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
};

const buildAvailableFilterValues = (manifests: Manifest[], path: string): Array<[string, number]> => {
  const counts = new Map<string, number>();

  for (const manifest of manifests) {
    const raw = getByDotPath(manifest.extractedData, path);
    const value = formatSchemaCellValueForFilter(raw);
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
};

type SchemaColumnHeaderProps = {
  path: string;
  label: string;
  manifests: Manifest[];
  filterValue: string;
  onSort: (field: string) => void;
  renderSortIcon: (field: string) => React.ReactNode;
  onFilterChange?: (fieldPath: string, value: string) => void;
};

function SchemaColumnHeader({
  path,
  label,
  manifests,
  filterValue,
  onSort,
  renderSortIcon,
  onFilterChange,
}: SchemaColumnHeaderProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const availableValues = useMemo(() => buildAvailableFilterValues(manifests, path), [manifests, path]);
  const normalizedFilter = filterValue.trim().toLowerCase();
  const visibleValues = useMemo(() => {
    if (!normalizedFilter) {
      return availableValues;
    }
    return availableValues.filter(([value]) => value.toLowerCase().includes(normalizedFilter));
  }, [availableValues, normalizedFilter]);

  const isActive = Boolean(filterValue.trim());

  return (
    <div className="flex flex-col gap-2 min-w-[10rem]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSort(path)}
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          title={path}
        >
          {label}
          {renderSortIcon(path)}
        </button>
        {onFilterChange ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t('manifests.table.columnFilterAria', { column: label })}
                className={`rounded-sm p-1 hover:bg-muted ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={(event) => event.stopPropagation()}
              >
                <Filter className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <Input
                value={filterValue}
                placeholder={t('manifests.filters.customField.valuePlaceholder')}
                aria-label={`${t('manifests.filters.customField.valueAria')}: ${label}`}
                className="h-8 text-xs"
                onChange={(event) => onFilterChange(path, event.target.value)}
              />
              <ScrollArea className="mt-2 max-h-56">
                <div className="space-y-1">
                  {visibleValues.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      {t('manifests.table.columnFilter.noValues')}
                    </div>
                  ) : (
                    visibleValues.slice(0, 50).map(([value, count]) => (
                      <button
                        key={value}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          onFilterChange(path, value);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">{value}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({count})</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
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
  onPreviewOcr,
  schemaColumns,
  schemaColumnFilters,
  onSchemaColumnFilterChange,
  columnVisibility,
  onColumnVisibilityChange,
}: ManifestTableProps) {
  const { t } = useI18n();
  const sorting = useMemo<SortingState>(
    () => (sort.field ? [{ id: sort.field, desc: sort.order === 'desc' }] : []),
    [sort],
  );
  const resolvedColumnVisibility = useMemo<VisibilityState>(() => columnVisibility ?? {}, [columnVisibility]);

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
    const dynamicColumns = schemaColumns ?? [];

    if (onSelectAll && onSelectToggle) {
      cols.push({
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectAll ?? false}
              onCheckedChange={() => onSelectAll()}
              aria-label={t('manifests.table.selectAllAria')}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectedIds?.has(row.original.id) ?? false}
              onCheckedChange={() => onSelectToggle(row.original.id)}
              onClick={(event) => event.stopPropagation()}
              aria-label={t('manifests.table.selectOneAria', {
                filename: row.original.originalFilename,
              })}
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
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.filename')}
            {renderSortIcon('filename')}
          </button>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:underline underline-offset-4"
            title={t('common.view')}
            onClick={() => onSelectManifest(row.original.id)}
          >
            {row.original.originalFilename}
          </button>
        ),
      },
      {
        id: 'status',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('status')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.status')}
            {renderSortIcon('status')}
          </button>
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          const statusLabel =
            status === 'pending'
              ? t('manifests.status.pending')
              : status === 'processing'
                ? t('manifests.status.processing')
                : status === 'completed'
                  ? t('manifests.status.completed')
                  : status === 'failed'
                    ? t('manifests.status.failed')
                    : status;
          const progress = manifestProgress?.[row.original.id];
          const showProgress = row.original.status === 'processing' || Boolean(progress);
          return (
            <div className="flex flex-col gap-2">
              <Badge className={`px-2 py-1 w-fit ${getStatusBadgeClasses(status)}`}>{statusLabel}</Badge>
              {showProgress ? (
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
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('manifests.table.actions')}
          </span>
        ),
        cell: ({ row }) => {
          const manifest = row.original;

          return (
            <div className="flex items-center justify-end gap-2">
              <ManifestActionsMenu manifest={manifest} onPreviewOcr={onPreviewOcr} />
            </div>
          );
        },
        meta: {
          cellClassName: 'text-right',
          headerClassName: 'text-right',
        },
      },
    );

    for (const column of dynamicColumns) {
      const path = column.path;
      const label = (typeof column.title === 'string' && column.title.trim())
        ? column.title.trim()
        : formatSchemaColumnLabel(path);

      cols.splice(cols.length - 1, 0, {
        id: path,
        header: () => (
          <SchemaColumnHeader
            path={path}
            label={label}
            manifests={manifests}
            filterValue={schemaColumnFilters?.[path] ?? ''}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            onFilterChange={onSchemaColumnFilterChange}
          />
        ),
        cell: ({ row }) => {
          const value = getByDotPath(row.original.extractedData, path);
          const display = formatSchemaCellValue(value, column, t('common.na'));
          return (
            <span className="text-sm text-muted-foreground" title={display !== t('common.na') ? display : undefined}>
              {display}
            </span>
          );
        },
      });
    }

    return cols;
  }, [
    handleSort,
    manifests,
    manifestProgress,
    onPreviewOcr,
    onSelectAll,
    onSelectManifest,
    onSelectToggle,
    renderSortIcon,
    selectedIds,
    selectAll,
    t,
    schemaColumns,
    schemaColumnFilters,
    onSchemaColumnFilterChange,
  ]);

  const table = useReactTable({
    data: manifests,
    columns,
    state: { sorting, columnVisibility: resolvedColumnVisibility },
    manualSorting: true,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
  });

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'border-border';
    if (confidence >= 0.9) return 'border-[color:var(--status-completed-text)]';
    if (confidence >= 0.7) return 'border-[color:var(--status-pending-text)]';
    return 'border-[color:var(--status-failed-text)]';
  };

  return (
    <div className="overflow-x-auto">
      <DataTable
        table={table}
        getRowClassName={(row) =>
          `hover:bg-muted border-l-4 ${getConfidenceColor(row.original.confidence)}`
        }
        emptyState={(
          <EmptyState
            title={t('manifests.table.empty.title')}
            description={t('manifests.table.empty.description')}
          />
        )}
      />
    </div>
  );
}
