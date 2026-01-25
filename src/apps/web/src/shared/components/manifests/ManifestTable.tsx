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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';
import { ProgressBar } from './ProgressBar';
import { ManifestActionsMenu } from './ManifestActionsMenu';
import { useI18n } from '@/shared/providers/I18nProvider';
import type { ManifestFilterValues } from '@/shared/types/manifests';
import { formatCostWithCurrency } from '@/shared/utils/cost';

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
  filters: ManifestFilterValues;
  onFiltersChange: (filters: ManifestFilterValues) => void;
  extractorTypeOptions?: Array<{ id: string; name: string }>;
  extractorOptions?: Array<{ id: string; name: string; extractorType?: string }>;
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

type SystemColumnHeaderProps = {
  id: string;
  label: string;
  sortable: boolean;
  isFilterActive: boolean;
  onSort?: (field: string) => void;
  renderSortIcon?: (field: string) => React.ReactNode;
  filterContent?: React.ReactNode;
};

function SystemColumnHeader({
  id,
  label,
  sortable,
  isFilterActive,
  onSort,
  renderSortIcon,
  filterContent,
}: SystemColumnHeaderProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 min-w-[10rem]">
      <div className="flex items-center justify-between gap-2">
        {sortable && onSort && renderSortIcon ? (
          <button
            type="button"
            onClick={() => onSort(id)}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            title={id}
          >
            {label}
            {renderSortIcon(id)}
          </button>
        ) : (
          <span
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            title={id}
          >
            {label}
          </span>
        )}

        {filterContent ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t('manifests.table.columnFilterAria', { column: label })}
                className={`rounded-sm p-1 hover:bg-muted ${isFilterActive ? 'text-primary' : 'text-muted-foreground'}`}
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
              {filterContent}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** idx;
  const precision = idx === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[idx]}`;
};

const toPercent = (value: number | undefined): string => {
  if (value === undefined) return '';
  const pct = Math.round(value * 1000) / 10;
  return String(pct);
};

const parsePercent = (raw: string): number | undefined => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (n <= 0) return undefined;
  if (n >= 100) return 1;
  return n / 100;
};

const deriveExtractionStatus = (manifest: Manifest): ManifestFilterValues['extractionStatus'] => {
  if (manifest.status === 'processing') return 'extracting';
  if (manifest.status === 'failed') return 'failed';
  if (manifest.status === 'pending' && !manifest.extractedData) return 'not_extracted';
  if (manifest.status === 'completed' && manifest.extractedData) {
    const errorCount = manifest.validationResults?.errorCount ?? 0;
    return errorCount > 0 ? 'partial' : 'complete';
  }
  return 'not_extracted';
};

export function ManifestTable({
  manifests,
  sort,
  onSortChange,
  onSelectManifest,
  filters,
  onFiltersChange,
  extractorTypeOptions,
  extractorOptions,
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

  const extractorById = useMemo(() => {
    const map = new Map<string, { name: string; extractorType?: string }>();
    for (const extractor of extractorOptions ?? []) {
      map.set(extractor.id, { name: extractor.name, extractorType: extractor.extractorType });
    }
    return map;
  }, [extractorOptions]);

  const extractorTypeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of extractorTypeOptions ?? []) {
      map.set(type.id, type.name);
    }
    return map;
  }, [extractorTypeOptions]);

  const updateFilters = useCallback(
    (patch: Partial<ManifestFilterValues>) => {
      onFiltersChange({ ...filters, ...patch });
    },
    [filters, onFiltersChange],
  );

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
          <SystemColumnHeader
            id="status"
            label={t('manifests.table.status')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={Boolean(filters.status)}
            filterContent={(
              <div className="space-y-2">
                <Select
                  value={filters.status ?? 'all'}
                  onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value as ManifestFilterValues['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('manifests.filters.status.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('manifests.filters.status.any')}</SelectItem>
                    <SelectItem value="pending">{t('manifests.status.pending')}</SelectItem>
                    <SelectItem value="processing">{t('manifests.status.processing')}</SelectItem>
                    <SelectItem value="completed">{t('manifests.status.completed')}</SelectItem>
                    <SelectItem value="failed">{t('manifests.status.failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          const liveStatus = manifestProgress?.[row.original.id]?.status?.toLowerCase();
          const effectiveStatus = (() => {
            if (!liveStatus) return status;
            if (['active', 'processing', 'running'].includes(liveStatus)) return 'processing';
            if (['waiting', 'pending', 'queued', 'delayed', 'paused'].includes(liveStatus)) return 'pending';
            if (liveStatus === 'completed') return 'completed';
            if (liveStatus === 'failed') return 'failed';
            return status;
          })();

          const statusLabel =
            effectiveStatus === 'pending'
              ? t('manifests.status.pending')
              : effectiveStatus === 'processing'
                ? t('manifests.status.processing')
                : effectiveStatus === 'completed'
                  ? t('manifests.status.completed')
                  : effectiveStatus === 'failed'
                    ? t('manifests.status.failed')
                    : effectiveStatus;
          const progress = manifestProgress?.[row.original.id];
          const showProgress = effectiveStatus === 'processing' || Boolean(progress);
          return (
            <div className="flex flex-col gap-2">
              <Badge className={`px-2 py-1 w-fit ${getStatusBadgeClasses(effectiveStatus)}`}>{statusLabel}</Badge>
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
        id: 'extractionStatus',
        header: () => (
          <SystemColumnHeader
            id="extractionStatus"
            label={t('manifests.filters.extractionStatus.label')}
            sortable={false}
            isFilterActive={Boolean(filters.extractionStatus)}
            filterContent={(
              <Select
                value={filters.extractionStatus ?? 'all'}
                onValueChange={(value) =>
                  updateFilters({
                    extractionStatus: value === 'all' ? undefined : (value as ManifestFilterValues['extractionStatus']),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('manifests.filters.extractionStatus.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('manifests.filters.extractionStatus.any')}</SelectItem>
                  <SelectItem value="not_extracted">{t('manifests.extractionStatus.notExtracted')}</SelectItem>
                  <SelectItem value="extracting">{t('manifests.extractionStatus.extracting')}</SelectItem>
                  <SelectItem value="complete">{t('manifests.extractionStatus.complete')}</SelectItem>
                  <SelectItem value="partial">{t('manifests.extractionStatus.partial')}</SelectItem>
                  <SelectItem value="failed">{t('manifests.extractionStatus.failed')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ),
        cell: ({ row }) => {
          const derived = deriveExtractionStatus(row.original);
          const label =
            derived === 'not_extracted'
              ? t('manifests.extractionStatus.notExtracted')
              : derived === 'extracting'
                ? t('manifests.extractionStatus.extracting')
                : derived === 'complete'
                  ? t('manifests.extractionStatus.complete')
                  : derived === 'partial'
                    ? t('manifests.extractionStatus.partial')
                    : t('manifests.extractionStatus.failed');
          return <span className="text-sm text-muted-foreground">{label}</span>;
        },
      },
      {
        id: 'humanVerified',
        header: () => (
          <SystemColumnHeader
            id="humanVerified"
            label={t('manifests.table.verified')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={filters.humanVerified !== undefined}
            filterContent={(
              <Select
                value={filters.humanVerified === undefined ? 'all' : filters.humanVerified ? 'true' : 'false'}
                onValueChange={(value) =>
                  updateFilters({
                    humanVerified: value === 'all' ? undefined : value === 'true',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('manifests.filters.status.any')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('manifests.filters.status.any')}</SelectItem>
                  <SelectItem value="true">{t('common.yes')}</SelectItem>
                  <SelectItem value="false">{t('common.no')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.humanVerified ? t('common.yes') : t('common.no')}
          </span>
        ),
      },
      {
        id: 'confidence',
        header: () => (
          <SystemColumnHeader
            id="confidence"
            label={t('manifests.card.confidence')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={filters.confidenceMin !== undefined || filters.confidenceMax !== undefined}
            filterContent={(
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={toPercent(filters.confidenceMin)}
                    placeholder="0"
                    onChange={(event) => updateFilters({ confidenceMin: parsePercent(event.target.value) })}
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={toPercent(filters.confidenceMax)}
                    placeholder="100"
                    onChange={(event) => updateFilters({ confidenceMax: parsePercent(event.target.value) })}
                  />
                </div>
                <div className="text-xs text-muted-foreground">{t('manifests.table.confidenceHint')}</div>
              </div>
            )}
          />
        ),
        cell: ({ row }) => {
          const confidence = row.original.confidence;
          if (confidence === null || confidence === undefined) {
            return <span className="text-sm text-muted-foreground">{t('common.na')}</span>;
          }
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {Math.round(confidence * 1000) / 10}%
            </span>
          );
        },
      },
      {
        id: 'poNo',
        header: () => (
          <SystemColumnHeader
            id="poNo"
            label={t('manifests.filters.poNumber.label')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={Boolean(filters.poNo?.trim())}
            filterContent={(
              <Input
                value={filters.poNo ?? ''}
                placeholder={t('manifests.filters.poNumber.placeholder')}
                onChange={(event) => updateFilters({ poNo: event.target.value || undefined })}
              />
            )}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.purchaseOrder ?? t('common.na')}</span>
        ),
      },
      {
        id: 'department',
        header: () => (
          <SystemColumnHeader
            id="department"
            label={t('manifests.filters.department.label')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={Boolean(filters.department?.trim())}
            filterContent={(
              <Input
                value={filters.department ?? ''}
                placeholder={t('manifests.filters.department.placeholder')}
                onChange={(event) => updateFilters({ department: event.target.value || undefined })}
              />
            )}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.department ?? t('common.na')}</span>
        ),
      },
      {
        id: 'invoiceDate',
        header: () => (
          <SystemColumnHeader
            id="invoiceDate"
            label={t('manifests.filters.invoiceDate.label')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={Boolean(filters.dateFrom) || Boolean(filters.dateTo)}
            filterContent={(
              <div className="space-y-2">
                <Input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  aria-label={t('manifests.filters.invoiceDate.fromAria')}
                  onChange={(event) => updateFilters({ dateFrom: event.target.value || undefined })}
                />
                <Input
                  type="date"
                  value={filters.dateTo ?? ''}
                  aria-label={t('manifests.filters.invoiceDate.toAria')}
                  onChange={(event) => updateFilters({ dateTo: event.target.value || undefined })}
                />
              </div>
            )}
          />
        ),
        cell: ({ row }) => {
          const value = row.original.invoiceDate;
          if (!value) return <span className="text-sm text-muted-foreground">{t('common.na')}</span>;
          const parsed = new Date(value);
          return (
            <span className="text-sm text-muted-foreground">
              {Number.isNaN(parsed.getTime()) ? value : format(parsed, 'PP')}
            </span>
          );
        },
      },
      {
        id: 'extractionCost',
        header: () => (
          <SystemColumnHeader
            id="extractionCost"
            label={t('manifests.card.cost')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={filters.costMin !== undefined || filters.costMax !== undefined}
            filterContent={(
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={filters.costMin ?? ''}
                    placeholder="0"
                    onChange={(event) => {
                      const n = Number(event.target.value);
                      updateFilters({ costMin: Number.isFinite(n) && event.target.value !== '' ? n : undefined });
                    }}
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={filters.costMax ?? ''}
                    placeholder=""
                    onChange={(event) => {
                      const n = Number(event.target.value);
                      updateFilters({ costMax: Number.isFinite(n) && event.target.value !== '' ? n : undefined });
                    }}
                  />
                </div>
              </div>
            )}
          />
        ),
        cell: ({ row }) => {
          const cost = row.original.extractionCost;
          if (cost === null || cost === undefined) {
            return <span className="text-sm text-muted-foreground">{t('common.na')}</span>;
          }
          const extractionCostCurrency = (row.original as { extractionCostCurrency?: string | null }).extractionCostCurrency;
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatCostWithCurrency(cost, extractionCostCurrency)}
            </span>
          );
        },
      },
      {
        id: 'ocrQualityScore',
        header: () => (
          <SystemColumnHeader
            id="ocrQualityScore"
            label={t('manifests.table.ocrQuality')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={filters.ocrQualityMin !== undefined || filters.ocrQualityMax !== undefined}
            filterContent={(
              <Select
                value={
                  filters.ocrQualityMin === 90 && filters.ocrQualityMax === 100
                    ? 'excellent'
                    : filters.ocrQualityMin === 70 && filters.ocrQualityMax === 89
                      ? 'good'
                      : filters.ocrQualityMin === 0 && filters.ocrQualityMax === 69
                        ? 'poor'
                        : filters.ocrQualityMin === 0 && filters.ocrQualityMax === 0
                          ? 'unprocessed'
                          : 'all'
                }
                onValueChange={(value) => {
                  if (value === 'excellent') updateFilters({ ocrQualityMin: 90, ocrQualityMax: 100 });
                  else if (value === 'good') updateFilters({ ocrQualityMin: 70, ocrQualityMax: 89 });
                  else if (value === 'poor') updateFilters({ ocrQualityMin: 0, ocrQualityMax: 69 });
                  else if (value === 'unprocessed') updateFilters({ ocrQualityMin: 0, ocrQualityMax: 0 });
                  else updateFilters({ ocrQualityMin: undefined, ocrQualityMax: undefined });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('manifests.filters.ocrQuality.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('manifests.filters.ocrQuality.any')}</SelectItem>
                  <SelectItem value="excellent">{t('manifests.filters.ocrQuality.excellent')}</SelectItem>
                  <SelectItem value="good">{t('manifests.filters.ocrQuality.good')}</SelectItem>
                  <SelectItem value="poor">{t('manifests.filters.ocrQuality.poor')}</SelectItem>
                  <SelectItem value="unprocessed">{t('manifests.filters.ocrQuality.notProcessed')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.original.ocrQualityScore ?? t('common.na')}
          </span>
        ),
      },
      {
        id: 'ocrProcessedAt',
        header: () => (
          <SystemColumnHeader
            id="ocrProcessedAt"
            label={t('manifests.table.ocrProcessedAt')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={false}
          />
        ),
        cell: ({ row }) => {
          const value = row.original.ocrProcessedAt;
          if (!value) return <span className="text-sm text-muted-foreground">{t('common.na')}</span>;
          const parsed = new Date(value);
          return (
            <span className="text-sm text-muted-foreground">
              {Number.isNaN(parsed.getTime()) ? value : format(parsed, 'PP p')}
            </span>
          );
        },
      },
      {
        id: 'extractorType',
        header: () => (
          <SystemColumnHeader
            id="extractorType"
            label={t('manifests.filters.extractorType.label')}
            sortable={false}
            isFilterActive={Boolean(filters.extractorType)}
            filterContent={(
              <Select
                value={filters.extractorType ?? 'all'}
                onValueChange={(value) =>
                  updateFilters({
                    extractorType: value === 'all' ? undefined : value,
                    textExtractorId: value === 'all' ? filters.textExtractorId : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('manifests.filters.extractorType.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('manifests.filters.extractorType.any')}</SelectItem>
                  {(extractorTypeOptions ?? []).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ),
        cell: ({ row }) => {
          const extractorId = row.original.textExtractorId;
          if (!extractorId) return <span className="text-sm text-muted-foreground">{t('common.na')}</span>;
          const typeId = extractorById.get(extractorId)?.extractorType;
          const display = typeId ? (extractorTypeNameById.get(typeId) ?? typeId) : t('common.na');
          return <span className="text-sm text-muted-foreground">{display}</span>;
        },
      },
      {
        id: 'textExtractorId',
        header: () => (
          <SystemColumnHeader
            id="textExtractorId"
            label={t('manifests.card.extractor')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={Boolean(filters.textExtractorId)}
            filterContent={(
              <Select
                value={filters.textExtractorId ?? 'all'}
                onValueChange={(value) =>
                  updateFilters({
                    textExtractorId: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('manifests.filters.extractor.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('manifests.filters.extractor.any')}</SelectItem>
                  {(extractorOptions ?? []).map((extractor) => (
                    <SelectItem key={extractor.id} value={extractor.id}>
                      {extractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ),
        cell: ({ row }) => {
          const id = row.original.textExtractorId;
          if (!id) return <span className="text-sm text-muted-foreground">{t('common.na')}</span>;
          const entry = extractorById.get(id);
          return <span className="text-sm text-muted-foreground">{entry?.name ?? id}</span>;
        },
      },
      {
        id: 'fileSize',
        header: () => (
          <SystemColumnHeader
            id="fileSize"
            label={t('manifests.card.size')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={false}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatBytes(row.original.fileSize ?? 0)}
          </span>
        ),
      },
      {
        id: 'fileType',
        header: () => (
          <SystemColumnHeader
            id="fileType"
            label={t('manifests.table.fileType')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={false}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.fileType ?? t('common.na')}</span>
        ),
      },
      {
        id: 'createdAt',
        header: () => (
          <SystemColumnHeader
            id="createdAt"
            label={t('manifests.table.createdAt')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={false}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt ? format(new Date(row.original.createdAt), 'PP p') : t('common.na')}
          </span>
        ),
      },
      {
        id: 'updatedAt',
        header: () => (
          <SystemColumnHeader
            id="updatedAt"
            label={t('manifests.table.updatedAt')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={false}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.updatedAt ? format(new Date(row.original.updatedAt), 'PP p') : t('common.na')}
          </span>
        ),
      },
      {
        id: 'id',
        header: () => (
          <SystemColumnHeader
            id="id"
            label={t('manifests.table.id')}
            sortable={true}
            onSort={handleSort}
            renderSortIcon={renderSortIcon}
            isFilterActive={false}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">{row.original.id}</span>
        ),
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
    updateFilters,
    filters,
    extractorById,
    extractorTypeNameById,
    extractorOptions,
    extractorTypeOptions,
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
