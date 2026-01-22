import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useManifests } from '@/shared/hooks/use-manifests';
import { useExportSelectedToCsv } from '@/shared/hooks/use-manifests';
import { useGroups, useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import { useQueryClient } from '@tanstack/react-query';
import { ManifestList } from '@/shared/components/manifests/ManifestList';
import { ManifestFilters } from '@/shared/components/manifests/ManifestFilters';
import { UploadDialog } from '@/shared/components/UploadDialog';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { ManifestFilterValues, ManifestSort } from '@/shared/types/manifests';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useI18n } from '@/shared/providers/I18nProvider';
import { deriveSchemaTableColumns } from '@/shared/utils/schema';
import type { ManifestTableSchemaColumn } from '@/shared/components/manifests/ManifestTable';

const FALLBACK_SCHEMA_COLUMN_LIMIT = 4;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function ManifestsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const groupId = Number(params.groupId);
  const queryClient = useQueryClient();
  const { project } = useProject(projectId);
  const { groups } = useGroups(projectId);
  const { schemas: projectSchemas } = useProjectSchemas(projectId);
  const groupLabel =
    groups.find((group) => group.id === groupId)?.name ?? t('groups.fallbackName', { id: groupId });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const exportSelectedToCsv = useExportSelectedToCsv();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<ManifestFilterValues>({});
  const [sort, setSort] = useState<ManifestSort>({
    field: 'filename',
    order: 'asc',
  });

  const resolvedJsonSchema = useMemo<Record<string, unknown> | null>(() => {
    const defaultSchemaId = project?.defaultSchemaId ?? null;
    const defaultSchema = defaultSchemaId
      ? projectSchemas.find((schema) => schema.id === defaultSchemaId)
      : undefined;
    const schema = defaultSchema ?? projectSchemas[0];
    const raw = schema?.jsonSchema;
    if (!isRecord(raw)) {
      return null;
    }
    return raw;
  }, [project?.defaultSchemaId, projectSchemas]);

  const schemaTableColumns = useMemo<ManifestTableSchemaColumn[]>(() => {
    if (!resolvedJsonSchema) {
      return [];
    }
    return deriveSchemaTableColumns(resolvedJsonSchema, { fallbackLimit: FALLBACK_SCHEMA_COLUMN_LIMIT });
  }, [resolvedJsonSchema]);

  const schemaColumnPaths = useMemo(() => schemaTableColumns.map((col) => col.path), [schemaTableColumns]);
  const schemaColumnPathSet = useMemo(() => new Set(schemaColumnPaths), [schemaColumnPaths]);

  const [schemaColumnFilterDrafts, setSchemaColumnFilterDrafts] = useState<Record<string, string>>({});
  const schemaColumnFilterTimer = useRef<number | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const path of schemaColumnPaths) {
      const existing = (filters.dynamicFilters ?? []).find((filter) => filter.field === path);
      next[path] = existing?.value ?? '';
    }
    setSchemaColumnFilterDrafts(next);
  }, [filters.dynamicFilters, schemaColumnPaths]);

  useEffect(() => {
    if (schemaColumnFilterTimer.current) {
      window.clearTimeout(schemaColumnFilterTimer.current);
    }

    schemaColumnFilterTimer.current = window.setTimeout(() => {
      const rawDynamicFilters = filters.dynamicFilters ?? [];
      const nonColumnFilters = rawDynamicFilters.filter((filter) => !schemaColumnPathSet.has(filter.field));

      const columnFilters = schemaColumnPaths
        .map((path) => ({
          field: path,
          value: (schemaColumnFilterDrafts[path] ?? '').trim(),
        }))
        .filter((filter) => filter.value);

      const nextDynamicFilters = [...nonColumnFilters, ...columnFilters];

      const currentNormalized = [...nonColumnFilters, ...rawDynamicFilters.filter((filter) => schemaColumnPathSet.has(filter.field))].filter((filter) => filter.value?.trim());
      const isEqual =
        currentNormalized.length === nextDynamicFilters.length &&
        currentNormalized.every((filter, idx) => filter.field === nextDynamicFilters[idx]?.field && filter.value === nextDynamicFilters[idx]?.value);

      if (!isEqual) {
        setFilters((prev) => ({ ...prev, dynamicFilters: nextDynamicFilters.length > 0 ? nextDynamicFilters : undefined }));
      }
    }, 300);

    return () => {
      if (schemaColumnFilterTimer.current) {
        window.clearTimeout(schemaColumnFilterTimer.current);
      }
    };
  }, [filters.dynamicFilters, schemaColumnFilterDrafts, schemaColumnPaths, schemaColumnPathSet]);

  const handleSchemaColumnFilterChange = useCallback((fieldPath: string, value: string) => {
    setSchemaColumnFilterDrafts((prev) => ({ ...prev, [fieldPath]: value }));
  }, []);

  const { data, isLoading } = useManifests(groupId, {
    filters,
    sort,
    page: currentPage,
    pageSize,
  });

  const manifests = data?.data ?? [];
  const meta = data?.meta;

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleSelectManifest = (manifestId: number) => {
    navigate(`/projects/${projectId}/groups/${groupId}/manifests/${manifestId}`, {
      state: { allManifestIds: manifests.map((m: { id: number }) => m.id) },
    });
  };

  const handleBatchExport = async (manifestIds: number[]) => {
    try {
      const blob = await exportSelectedToCsv.mutateAsync(manifestIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifests-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBatchReExtract = (manifestIds: number[]) => {
    // This would trigger re-extraction for selected manifests
    // Implementation depends on backend API
    void manifestIds;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-background">
        <div className="w-full">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <AppBreadcrumbs
            className="mb-4"
            items={[
              { label: t('nav.projects'), to: '/projects' },
              {
                label: project?.name ?? t('projects.fallbackName', { id: projectId }),
                to: `/projects/${projectId}`,
              },
              { label: t('manifests.breadcrumbWithGroup', { group: groupLabel }) },
            ]}
          />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('manifests.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('manifests.subtitleCount', {
                  count: meta?.total ?? 0,
                  plural: (meta?.total ?? 0) === 1 ? '' : 's',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdvancedFiltersOpen(true)}
              >
                {t('manifests.filters.title')}
              </Button>
              <Button
                type="button"
                onClick={() => setIsUploadOpen(true)}
              >
                {t('manifests.uploadButton')}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="min-w-0">
          <ManifestList
            manifests={manifests}
            totalManifests={meta?.total ?? 0}
            sort={sort}
            onViewModeChange={setViewMode}
            onSortChange={setSort}
            onSelectManifest={handleSelectManifest}
            viewMode={viewMode}
            onBatchExport={handleBatchExport}
            onBatchReExtract={handleBatchReExtract}
            currentPage={meta?.page ?? currentPage}
            pageSize={meta?.pageSize ?? pageSize}
            totalPages={meta?.totalPages ?? 0}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            schemaColumns={schemaTableColumns}
            schemaColumnFilters={schemaColumnFilterDrafts}
            onSchemaColumnFilterChange={handleSchemaColumnFilterChange}
          />
        </div>
      </div>

      <Dialog open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
        <DialogSideContent>
          <DialogHeader>
            <DialogTitle>{t('manifests.filters.title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('manifests.filters.title')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ManifestFilters
              values={filters}
              onChange={setFilters}
              manifestCount={meta?.total ?? 0}
              variant="dialog"
            />
          </div>
        </DialogSideContent>
      </Dialog>

      <UploadDialog
        groupId={groupId}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onComplete={() =>
          queryClient.invalidateQueries({
            queryKey: ['manifests', 'group', groupId],
          })
        }
      />
    </div>
  );
}




