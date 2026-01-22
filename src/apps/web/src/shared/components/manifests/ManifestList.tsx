import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileText, LayoutGrid, List } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { ManifestTable, type ManifestTableSchemaColumn } from './ManifestTable';
import { ManifestCard } from './ManifestCard';
import { Pagination } from './Pagination';
import { OcrPreviewModal } from './OcrPreviewModal';
import { useWebSocket, JobUpdateEvent, ManifestUpdateEvent } from '@/shared/hooks/use-websocket';
import { useRunBatchValidation } from '@/shared/hooks/use-validation-scripts';
import { ManifestSort } from '@/shared/types/manifests';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';

interface ManifestListProps {
  manifests: Manifest[];
  totalManifests: number;
  sort: ManifestSort;
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
  onSortChange: (sort: ManifestSort) => void;
  onSelectManifest: (manifestId: number) => void;
  onBatchExport?: (manifestIds: number[]) => void;
  onBatchReExtract?: (manifestIds: number[]) => void;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  schemaColumns?: ManifestTableSchemaColumn[];
  schemaColumnFilters?: Record<string, string>;
  onSchemaColumnFilterChange?: (fieldPath: string, value: string) => void;
}

interface BatchValidationSummary {
  errorCount?: number;
  warningCount?: number;
}

export function ManifestList({
  manifests,
  totalManifests,
  sort,
  viewMode,
  onViewModeChange,
  onSortChange,
  onSelectManifest,
  onBatchExport,
  onBatchReExtract,
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
  const { alert, ModalDialog } = useModalDialog();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [ocrPreviewManifestId, setOcrPreviewManifestId] = useState<number | null>(null);
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
  const [manifestProgress, setManifestProgress] = useState<Record<number, { progress: number; status: string; error?: string }>>({});
  const [validationProgress, setValidationProgress] = useState<{
    completed: number;
    total: number;
    results: Record<number, BatchValidationSummary>;
  }>({ completed: 0, total: 0, results: {} });

  const runBatchValidation = useRunBatchValidation();
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
    if (onBatchExport && selectedIds.size > 0) {
      onBatchExport(Array.from(selectedIds));
    }
  };

  const handleBatchReExtract = () => {
    if (onBatchReExtract && selectedIds.size > 0) {
      onBatchReExtract(Array.from(selectedIds));
    }
  };

  const handleBatchValidate = async () => {
    if (selectedIds.size === 0) return;

    // Filter manifests that are completed
    const completedManifests = manifests.filter(m => selectedIds.has(m.id) && m.status === 'completed');
    if (completedManifests.length === 0) {
      void alert({
        title: t('manifests.list.batchValidation.title'),
        message: t('manifests.list.batchValidation.onlyCompletedMessage'),
      });
      return;
    }

    const manifestIdsToValidate = completedManifests.map(m => m.id);

    setValidationProgress({
      completed: 0,
      total: manifestIdsToValidate.length,
      results: {},
    });

    try {
      const results = await runBatchValidation.mutateAsync({ manifestIds: manifestIdsToValidate });

      // Process results
      const totalErrors = Object.values(results).reduce((sum, r) => sum + (r.errorCount ?? 0), 0);
      const totalWarnings = Object.values(results).reduce((sum, r) => sum + (r.warningCount ?? 0), 0);

      setValidationProgress({
        completed: manifestIdsToValidate.length,
        total: manifestIdsToValidate.length,
        results,
      });

      // Show summary
      const message = t('manifests.list.batchValidation.summaryMessage', {
        count: manifestIdsToValidate.length,
        errors: totalErrors,
        warnings: totalWarnings,
      });
      void alert({ title: t('manifests.list.batchValidation.completeTitle'), message });

      // Clear selection and progress after a delay
      setTimeout(() => {
        setValidationProgress({ completed: 0, total: 0, results: {} });
        setSelectedIds(new Set());
        setSelectAll(false);
      }, 3000);
    } catch (error) {
      console.error('Batch validation failed:', error);
      void alert({
        title: t('manifests.list.batchValidation.failedTitle'),
        message: t('manifests.list.batchValidation.failedMessage'),
      });
      setValidationProgress({ completed: 0, total: 0, results: {} });
    }
  };

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

  const handlePreviewOcr = useCallback((manifestId: number) => {
    setOcrPreviewManifestId(manifestId);
    setOcrPreviewOpen(true);
  }, []);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('manifests.list.titleWithCount', { count: totalManifests })}
          </h2>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('manifests.list.selectedCount', { count: selectedIds.size })}
              </span>
              <Button
                onClick={handleBatchExport}
                size="sm"
              >
                {t('manifests.list.exportCsv')}
              </Button>
              <Button
                onClick={handleBatchValidate}
                disabled={runBatchValidation.isPending || validationProgress.total > 0}
                size="sm"
                variant="secondary"
              >
                {validationProgress.total > 0
                  ? t('manifests.list.batchValidation.progressLabel', {
                    completed: validationProgress.completed,
                    total: validationProgress.total,
                  })
                  : runBatchValidation.isPending
                    ? t('manifests.list.batchValidation.runningLabel')
                    : t('manifests.list.batchValidation.runLabel')}
              </Button>
              <Button
                onClick={handleBatchReExtract}
                size="sm"
                variant="outline"
              >
                {t('manifests.list.reextract')}
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {t('pagination.pageOf', {
              current: currentPage,
              total: totalPages || 1,
            })}
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
                <DropdownMenuCheckboxItem
                  checked={isColumnVisible('status')}
                  disabled={isColumnVisible('status') && sort.field === 'status'}
                  onCheckedChange={(checked) => setColumnVisible('status', checked === true)}
                >
                  {t('manifests.table.status')}
                </DropdownMenuCheckboxItem>

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




