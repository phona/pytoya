import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  type ColumnDef,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Play, RefreshCw, XCircle } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { DataTable } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';
import { ProgressBar } from './ProgressBar';
import { ExtractionActionsMenu } from './ExtractionActionsMenu';
import { useI18n } from '@/shared/providers/I18nProvider';

interface ManifestTableProps {
  projectId?: number;
  manifests: Manifest[];
  sort: { field: string; order: 'asc' | 'desc' };
  onSortChange: (sort: { field: string; order: 'asc' | 'desc' }) => void;
  onSelectManifest: (manifestId: number) => void;
  extractorLookup?: Record<string, { name: string; type?: string }>;
  selectedIds?: Set<number>;
  onSelectToggle?: (id: number) => void;
  onSelectAll?: () => void;
  selectAll?: boolean;
  manifestProgress?: Record<number, { progress: number; status: string; error?: string }>;
  onExtract?: (manifestId: number) => void;
  onReExtract?: (manifestId: number) => void;
  onPreviewOcr?: (manifestId: number) => void;
}

const getOcrQualityBadge = (score: number | null | undefined, naLabel: string) => {
  if (score === null || score === undefined) {
    return { label: naLabel, className: 'bg-muted text-muted-foreground' };
  }
  if (score >= 90) return { label: `${score}%`, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100' };
  if (score >= 70) return { label: `${score}%`, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' };
  return { label: `${score}%`, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' };
};

export function ManifestTable({
  projectId,
  manifests,
  sort,
  onSortChange,
  onSelectManifest,
  extractorLookup,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  selectAll,
  manifestProgress,
  onExtract,
  onReExtract,
  onPreviewOcr,
}: ManifestTableProps) {
  const { t } = useI18n();
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
          <div className="text-sm font-medium text-foreground">
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
          return (
            <Badge className={`px-2 py-1 ${getStatusBadgeClasses(status)}`}>{statusLabel}</Badge>
          );
        },
      },
      {
        id: 'extractor',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('manifests.table.extractor')}
          </span>
        ),
        cell: ({ row }) => {
          const extractorId = row.original.textExtractorId ?? '';
          const extractorInfo = extractorId ? extractorLookup?.[extractorId] : undefined;
          if (!extractorId) {
            return <span className="text-xs text-muted-foreground">{t('manifests.table.unassigned')}</span>;
          }
          return (
            <div className="flex flex-col gap-1">
              <Badge className="w-fit bg-primary/10 text-primary">
                {extractorInfo?.type ?? t('manifests.table.extractor')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {extractorInfo?.name ?? extractorId}
              </span>
            </div>
          );
        },
      },
      {
        id: 'ocrQuality',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('ocrQualityScore')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.text')}
            {renderSortIcon('ocrQualityScore')}
          </button>
        ),
        cell: ({ row }) => {
          const qualityBadge = getOcrQualityBadge(row.original.ocrQualityScore, t('common.na'));
          return (
            <Badge className={`px-2 py-1 ${qualityBadge.className}`}>{qualityBadge.label}</Badge>
          );
        },
      },
      {
        id: 'progress',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('manifests.table.progress')}
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
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'poNo',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('poNo')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.poNo')}
            {renderSortIcon('poNo')}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.purchaseOrder ?? t('common.na')}
          </span>
        ),
      },
      {
        id: 'invoiceDate',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('invoiceDate')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.invoiceDate')}
            {renderSortIcon('invoiceDate')}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.invoiceDate
              ? format(new Date(row.original.invoiceDate), 'PP')
              : t('common.na')}
          </span>
        ),
      },
      {
        id: 'department',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('manifests.table.department')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.department ?? t('common.na')}
          </span>
        ),
      },
      {
        id: 'cost',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('extractionCost')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.cost')}
            {renderSortIcon('extractionCost')}
          </button>
        ),
        cell: ({ row }) => {
          const cost = row.original.extractionCost;
          if (cost === null || cost === undefined) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          return (
            <span className="text-sm font-medium text-foreground">
              ${Number(cost).toFixed(4)}
            </span>
          );
        },
      },
      {
        id: 'confidence',
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('confidence')}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t('manifests.table.confidence')}
            {renderSortIcon('confidence')}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.confidence !== null
              ? `${Math.round(row.original.confidence * 100)}%`
              : t('common.na')}
          </span>
        ),
      },
      {
        id: 'verified',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('manifests.table.verified')}
          </span>
        ),
        cell: ({ row }) => (
          row.original.humanVerified ? (
            <CheckCircle2 className="h-5 w-5 text-[color:var(--status-completed-text)]" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground" />
          )
        ),
        meta: {
          cellClassName: 'text-center',
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
          const isCompleted = manifest.status === 'completed';
          const canExtract = manifest.status === 'pending' || manifest.status === 'failed';

          return (
            <div className="flex items-center justify-end gap-2">
              {onPreviewOcr && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewOcr(manifest.id);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title={t('manifests.table.previewText')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onExtract && canExtract && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onExtract(manifest.id);
                    }}
                    className="text-primary hover:text-primary"
                    title={t('manifests.table.extract')}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <ExtractionActionsMenu
                    projectId={projectId}
                    manifestId={manifest.id}
                    manifestName={manifest.originalFilename}
                  />
                </>
              )}
              {onReExtract && isCompleted && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReExtract(manifest.id);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    title={t('manifests.table.reextract')}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <ExtractionActionsMenu
                    projectId={projectId}
                    manifestId={manifest.id}
                    manifestName={manifest.originalFilename}
                  />
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectManifest(manifest.id);
                }}
                className="text-primary hover:text-primary"
                title={t('manifests.table.viewDetails')}
              >
                {t('common.view')}
              </Button>
            </div>
          );
        },
        meta: {
          cellClassName: 'text-right',
          headerClassName: 'text-right',
        },
      },
    );

    return cols;
  }, [
    extractorLookup,
    handleSort,
    manifestProgress,
    projectId,
    onPreviewOcr,
    onExtract,
    onReExtract,
    onSelectAll,
    onSelectManifest,
    onSelectToggle,
    renderSortIcon,
    selectedIds,
    selectAll,
    t,
  ]);

  const table = useReactTable({
    data: manifests,
    columns,
    state: { sorting },
    manualSorting: true,
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
        onRowClick={(row) => onSelectManifest(row.original.id)}
        getRowClassName={(row) =>
          `hover:bg-muted cursor-pointer border-l-4 ${getConfidenceColor(row.original.confidence)}`
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
