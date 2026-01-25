import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileText, LayoutGrid, List } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { ManifestTable, type ManifestTableSchemaColumn } from './ManifestTable';
import { ManifestCard } from './ManifestCard';
import { Pagination } from './Pagination';
import { OcrPreviewModal } from './OcrPreviewModal';
import { ExtractFilteredModal } from './ExtractFilteredModal';
import { ManifestBatchScopeModal } from './ManifestBatchScopeModal';
import { useWebSocket, JobUpdateEvent, ManifestUpdateEvent } from '@/shared/hooks/use-websocket';
import { useRunBatchValidation } from '@/shared/hooks/use-validation-scripts';
import { useDeleteManifestsBulk } from '@/shared/hooks/use-manifests';
import { ManifestFilterValues, ManifestSort } from '@/shared/types/manifests';
import { useExtractorTypes, useExtractors } from '@/shared/hooks/use-extractors';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';
import { useQueryClient } from '@tanstack/react-query';
import { getApiErrorText } from '@/api/client';
import { toast } from '@/shared/hooks/use-toast';

export type AuditScope = 'filtered' | 'selected' | 'all';
export type ExportFormat = 'csv' | 'xlsx';

interface ManifestListProps {
  groupId: number;
  manifests: Manifest[];
  totalManifests: number;
  filters: ManifestFilterValues;
  onFiltersChange: (filters: ManifestFilterValues) => void;
  sort: ManifestSort;
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
  onSortChange: (sort: ManifestSort) => void;
  onSelectManifest: (manifestId: number) => void;
  onAudit?: (scope: AuditScope, selectedIds?: number[]) => void;
  onBatchExport?: (manifestIds: number[], format: ExportFormat) => Promise<void> | void;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  schemaColumns?: ManifestTableSchemaColumn[];
  schemaColumnFilters?: Record<string, string>;
  onSchemaColumnFilterChange?: (fieldPath: string, value: string) => void;
}

export function ManifestList({
  groupId,
  manifests,
  totalManifests,
  filters,
  onFiltersChange,
  sort,
  viewMode,
  onViewModeChange,
  onSortChange,
  onSelectManifest,
  onAudit,
  onBatchExport,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  schemaColumns,
  schemaColumnFilters,
  onSchemaColumnFilterChange,
}: ManifestListProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { alert, ModalDialog } = useModalDialog();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const defaultHiddenSystemColumns = [
      'extractionStatus',
      'humanVerified',
      'confidence',
      'poNo',
      'department',
      'invoiceDate',
      'extractionCost',
      'ocrQualityScore',
      'ocrProcessedAt',
      'extractorType',
      'textExtractorId',
      'fileSize',
      'fileType',
      'createdAt',
      'updatedAt',
      'id',
    ] as const;
    return Object.fromEntries(defaultHiddenSystemColumns.map((id) => [id, false]));
  });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ocrPreviewManifestId, setOcrPreviewManifestId] = useState<number | null>(null);
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
  const [manifestProgress, setManifestProgress] = useState<Record<number, { progress: number; status: string; error?: string }>>({});

  const runBatchValidation = useRunBatchValidation();
  const deleteManifestsBulk = useDeleteManifestsBulk();
  const { extractors } = useExtractors();
  const { types: extractorTypes } = useExtractorTypes();

  const extractorTypeLookup = useMemo(() => {
    return extractorTypes.reduce<Record<string, string>>((acc, type) => {
      acc[type.id] = type.name;
      return acc;
    }, {});
  }, [extractorTypes]);

  const extractorLookup = useMemo(() => {
    return extractors.reduce<Record<string, { name: string; type?: string }>>((acc, extractor) => {
      acc[extractor.id] = {
        name: extractor.name,
        type: extractorTypeLookup[extractor.extractorType] ?? extractor.extractorType,
      };
      return acc;
    }, {});
  }, [extractorTypeLookup, extractors]);

  const extractorTypeOptions = useMemo(
    () => extractorTypes.map((type) => ({ id: type.id, name: type.name })),
    [extractorTypes],
  );

  const extractorOptions = useMemo(
    () =>
      extractors.map((extractor) => ({
        id: extractor.id,
        name: extractor.name,
        extractorType: extractor.extractorType,
      })),
    [extractors],
  );

  // Handle WebSocket updates
  const handleJobUpdate = useCallback((data: JobUpdateEvent) => {
    setManifestProgress((prev) => ({
      ...prev,
      [data.manifestId]: {
        progress: data.progress,
        status: data.status,
        error: data.error,
      },
    }));
  }, []);

  const handleManifestUpdate = useCallback((data: ManifestUpdateEvent) => {
    setManifestProgress((prev) => {
      const { manifestId, ...rest } = data;
      return {
        ...prev,
        [manifestId]: rest,
      };
    });
  }, []);

  useWebSocket({
    onJobUpdate: handleJobUpdate,
    onManifestUpdate: handleManifestUpdate,
  });

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [currentPage, manifests]);

  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(false);
  };

  const handleBatchExport = () => {
    setExportModalOpen(true);
  };

  const handleBatchValidate = () => {
    setValidationModalOpen(true);
  };

  const handleBatchDelete = () => {
    setDeleteModalOpen(true);
  };

  const selectedManifests = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return manifests.filter((m) => selectedIds.has(m.id));
  }, [manifests, selectedIds]);

  const validationEligibility = useMemo(() => {
    return {
      hint: t('manifests.batchAction.validation.eligibilityHint'),
      isEligible: (manifest: Manifest) => manifest.status === 'completed' && Boolean(manifest.extractedData),
    };
  }, [t]);

  const handleStartValidation = useCallback(async (manifestIds: number[]) => {
    const results = await runBatchValidation.mutateAsync({ manifestIds });
    const totalErrors = Object.values(results).reduce((sum, r) => sum + (r.errorCount ?? 0), 0);
    const totalWarnings = Object.values(results).reduce((sum, r) => sum + (r.warningCount ?? 0), 0);

    const message = t('manifests.list.batchValidation.summaryMessage', {
      count: manifestIds.length,
      errors: totalErrors,
      warnings: totalWarnings,
    });
    await alert({ title: t('manifests.list.batchValidation.completeTitle'), message });

    queryClient.invalidateQueries({ queryKey: ['manifests', 'group'] });
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [alert, queryClient, runBatchValidation, t]);

  const handlePageChange = useCallback((page: number) => {
    setSelectedIds(new Set());
    setSelectAll(false);
    onPageChange(page);
  }, [onPageChange]);

  const handlePageSizeChange = useCallback((size: number) => {
    setSelectedIds(new Set());
    setSelectAll(false);
    onPageSizeChange(size);
  }, [onPageSizeChange]);

  // Update select all to work with current page
  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(manifests.map((m) => m.id)));
    }
    setSelectAll(!selectAll);
  };

  const isColumnVisible = useCallback((columnId: string) => {
    return columnVisibility[columnId] !== false;
  }, [columnVisibility]);

  const setColumnVisible = useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [columnId]: visible };
      if (visible) {
        delete next[columnId];
      }
      return next;
    });
  }, []);

  const schemaColumnOptions = useMemo(() => {
    return (schemaColumns ?? []).map((column) => ({
      id: column.path,
      label: (typeof column.title === 'string' && column.title.trim()) ? column.title.trim() : column.path,
      hasActiveFilter: Boolean((schemaColumnFilters?.[column.path] ?? '').trim()),
    }));
  }, [schemaColumns, schemaColumnFilters]);

  const systemColumnOptions = useMemo(() => {
    return [
      {
        id: 'status',
        label: t('manifests.table.status'),
        hasActiveFilter: Boolean(filters.status),
      },
      {
        id: 'extractionStatus',
        label: t('manifests.filters.extractionStatus.label'),
        hasActiveFilter: Boolean(filters.extractionStatus),
      },
      {
        id: 'humanVerified',
        label: t('manifests.table.verified'),
        hasActiveFilter: filters.humanVerified !== undefined,
      },
      {
        id: 'confidence',
        label: t('manifests.card.confidence'),
        hasActiveFilter: filters.confidenceMin !== undefined || filters.confidenceMax !== undefined,
      },
      {
        id: 'poNo',
        label: t('manifests.filters.poNumber.label'),
        hasActiveFilter: Boolean(filters.poNo?.trim()),
      },
      {
        id: 'department',
        label: t('manifests.filters.department.label'),
        hasActiveFilter: Boolean(filters.department?.trim()),
      },
      {
        id: 'invoiceDate',
        label: t('manifests.filters.invoiceDate.label'),
        hasActiveFilter: Boolean(filters.dateFrom) || Boolean(filters.dateTo),
      },
      {
        id: 'extractionCost',
        label: t('manifests.card.cost'),
        hasActiveFilter: filters.costMin !== undefined || filters.costMax !== undefined,
      },
      {
        id: 'ocrQualityScore',
        label: t('manifests.table.ocrQuality'),
        hasActiveFilter: filters.ocrQualityMin !== undefined || filters.ocrQualityMax !== undefined,
      },
      {
        id: 'ocrProcessedAt',
        label: t('manifests.table.ocrProcessedAt'),
        hasActiveFilter: false,
      },
      {
        id: 'extractorType',
        label: t('manifests.filters.extractorType.label'),
        hasActiveFilter: Boolean(filters.extractorType),
      },
      {
        id: 'textExtractorId',
        label: t('manifests.card.extractor'),
        hasActiveFilter: Boolean(filters.textExtractorId),
      },
      {
        id: 'fileSize',
        label: t('manifests.card.size'),
        hasActiveFilter: false,
      },
      {
        id: 'fileType',
        label: t('manifests.table.fileType'),
        hasActiveFilter: false,
      },
      {
        id: 'createdAt',
        label: t('manifests.table.createdAt'),
        hasActiveFilter: false,
      },
      {
        id: 'updatedAt',
        label: t('manifests.table.updatedAt'),
        hasActiveFilter: false,
      },
      {
        id: 'id',
        label: t('manifests.table.id'),
        hasActiveFilter: false,
      },
    ];
  }, [filters, t]);

  const handlePreviewOcr = useCallback((manifestId: number) => {
    setOcrPreviewManifestId(manifestId);
    setOcrPreviewOpen(true);
  }, []);

  const hasAnyFilters = useMemo(() => {
    return Boolean(
      filters.status ||
        filters.poNo ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.department ||
        filters.confidenceMin !== undefined ||
        filters.confidenceMax !== undefined ||
        filters.ocrQualityMin !== undefined ||
        filters.ocrQualityMax !== undefined ||
        filters.extractionStatus ||
        filters.costMin !== undefined ||
        filters.costMax !== undefined ||
        filters.humanVerified !== undefined ||
        filters.textExtractorId ||
        filters.extractorType ||
        (filters.dynamicFilters && filters.dynamicFilters.length > 0),
    );
  }, [filters]);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('manifests.list.titleWithCount', { count: totalManifests })}
          </h2>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {t('manifests.list.selectedCount', { count: selectedIds.size })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {t('pagination.pageOf', {
              current: currentPage,
              total: totalPages || 1,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleBatchExport}
              size="sm"
              variant="outline"
              disabled={!onBatchExport}
            >
              {t('manifests.list.export')}
            </Button>
            <Button type="button" onClick={handleBatchValidate} size="sm" variant="outline">
              {t('manifests.list.batchValidation.runLabel')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setExtractModalOpen(true)}>
              {t('manifests.list.extract')}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={handleBatchDelete}>
              {t('manifests.list.deleteBulk')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={!onAudit || totalManifests <= 0}>
                  {t('manifests.list.audit')}
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('manifests.auditMenu.title')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onAudit?.('filtered')}>
                  {t('manifests.auditMenu.filtered', { count: totalManifests })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedIds.size === 0}
                  onClick={() => onAudit?.('selected', Array.from(selectedIds))}
                >
                  {t('manifests.auditMenu.selected', { count: selectedIds.size })}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAudit?.('all')}>
                  {hasAnyFilters
                    ? t('manifests.auditMenu.all')
                    : t('manifests.auditMenu.allWithCount', { count: totalManifests })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {viewMode === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {t('manifests.list.columns.title')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('manifests.list.columns.system')}</DropdownMenuLabel>
                {systemColumnOptions.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={isColumnVisible(column.id)}
                    disabled={
                      isColumnVisible(column.id) &&
                      (sort.field === column.id || column.hasActiveFilter)
                    }
                    onCheckedChange={(checked) => setColumnVisible(column.id, checked === true)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('manifests.list.columns.schema')}</DropdownMenuLabel>
                {schemaColumnOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t('manifests.list.columns.noSchemaFields')}
                  </div>
                ) : (
                  schemaColumnOptions.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={isColumnVisible(column.id)}
                      disabled={
                        isColumnVisible(column.id) &&
                        (sort.field === column.id || column.hasActiveFilter)
                      }
                      onCheckedChange={(checked) => setColumnVisible(column.id, checked === true)}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* View Toggle */}
          <TooltipProvider>
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('manifests.list.view.table')}
                    onClick={() => onViewModeChange('table')}
                    className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                      viewMode === 'table'
                        ? 'bg-primary/10 text-primary border-primary z-[var(--z-index-dropdown)]'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('manifests.list.view.table')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('manifests.list.view.card')}
                    onClick={() => onViewModeChange('card')}
                    className={`px-3 py-2 text-sm font-medium rounded-r-lg border -ml-px ${
                      viewMode === 'card'
                        ? 'bg-primary/10 text-primary border-primary z-[var(--z-index-dropdown)]'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('manifests.list.view.card')}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <ModalDialog />
      <ManifestBatchScopeModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title={t('manifests.batchAction.export.title')}
        subtitle={t('manifests.batchAction.export.subtitle')}
        startLabel={t('manifests.list.export')}
        groupId={groupId}
        filters={filters}
        sort={sort}
        selectedManifests={selectedManifests}
        formatOptions={{ defaultFormat: 'csv' }}
        onStart={async (manifestIds, _scope, format) => {
          if (!onBatchExport) return;
          await Promise.resolve(onBatchExport(manifestIds, format ?? 'csv'));
        }}
      />
      <ManifestBatchScopeModal
        open={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        title={t('manifests.batchAction.validation.title')}
        subtitle={t('manifests.batchAction.validation.subtitle')}
        startLabel={t('manifests.list.batchValidation.runLabel')}
        groupId={groupId}
        filters={filters}
        sort={sort}
        selectedManifests={selectedManifests}
        eligibility={validationEligibility}
        onStart={async (manifestIds) => handleStartValidation(manifestIds)}
      />
      <ManifestBatchScopeModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t('manifests.batchAction.delete.title')}
        subtitle={t('manifests.batchAction.delete.subtitle')}
        startLabel={t('common.delete')}
        startVariant="destructive"
        notice={t('manifests.batchAction.delete.notice')}
        filteredScopeEnabled={hasAnyFilters}
        filteredScopeDisabledHint={t('manifests.batchAction.delete.filteredDisabledHint')}
        groupId={groupId}
        filters={filters}
        sort={sort}
        selectedManifests={selectedManifests}
        onStart={async (manifestIds) => {
          try {
            const result = await deleteManifestsBulk.mutateAsync({ groupId, manifestIds });
            const deletedCount = result.deletedCount ?? manifestIds.length;
            toast({
              title: t('manifests.batchAction.delete.successTitle', {
                count: deletedCount,
                plural: deletedCount === 1 ? '' : 's',
              }),
            });
            queryClient.invalidateQueries({ queryKey: ['manifests', 'group'] });
            setSelectedIds(new Set());
            setSelectAll(false);
          } catch (error) {
            throw new Error(getApiErrorText(error, t));
          }
        }}
      />
      <ExtractFilteredModal
        open={extractModalOpen}
        onClose={() => setExtractModalOpen(false)}
        groupId={groupId}
        totalManifests={totalManifests}
        selectedManifestIds={Array.from(selectedIds)}
        filters={filters}
        sort={sort}
      />
      <OcrPreviewModal
        manifestId={ocrPreviewManifestId ?? 0}
        open={ocrPreviewOpen}
        onClose={() => setOcrPreviewOpen(false)}
      />

      {/* Content */}
      {manifests.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">{t('manifests.list.empty.title')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('manifests.list.empty.description')}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <ManifestTable
              manifests={manifests}
              sort={sort}
              onSortChange={onSortChange}
              onSelectManifest={onSelectManifest}
              filters={filters}
              onFiltersChange={onFiltersChange}
              extractorTypeOptions={extractorTypeOptions}
              extractorOptions={extractorOptions}
              selectedIds={selectedIds}
              onSelectToggle={handleToggleSelect}
              onSelectAll={handleToggleSelectAll}
              selectAll={selectAll}
              manifestProgress={manifestProgress}
              schemaColumns={schemaColumns}
              schemaColumnFilters={schemaColumnFilters}
              onSchemaColumnFilterChange={onSchemaColumnFilterChange}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              onPreviewOcr={handlePreviewOcr}
            />
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {manifests.map((manifest) => (
                <ManifestCard
                  key={manifest.id}
                  manifest={manifest}
                  extractorInfo={manifest.textExtractorId ? extractorLookup[manifest.textExtractorId] : undefined}
                  onClick={() => onSelectManifest(manifest.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalManifests > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalManifests}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>
  );
}




