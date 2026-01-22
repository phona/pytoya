import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useManifests } from '@/shared/hooks/use-manifests';
import { useExportSelectedToCsv } from '@/shared/hooks/use-manifests';
import { useGroups, useProject } from '@/shared/hooks/use-projects';
import { useQueryClient } from '@tanstack/react-query';
import { ManifestList } from '@/shared/components/manifests/ManifestList';
import { ManifestFilters } from '@/shared/components/manifests/ManifestFilters';
import { UploadDialog } from '@/shared/components/UploadDialog';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { ManifestFilterValues, ManifestSort } from '@/shared/types/manifests';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ManifestsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const groupId = Number(params.groupId);
  const queryClient = useQueryClient();
  const { project } = useProject(projectId);
  const { groups } = useGroups(projectId);
  const groupLabel =
    groups.find((group) => group.id === groupId)?.name ?? t('groups.fallbackName', { id: groupId });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const exportSelectedToCsv = useExportSelectedToCsv();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<ManifestFilterValues>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<ManifestSort>({
    field: 'filename',
    order: 'asc',
  });

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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-6">
            <div className="w-64 flex-shrink-0 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Button
              type="button"
              onClick={() => setIsUploadOpen(true)}
            >
              {t('manifests.uploadButton')}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Filters Sidebar */}
          <div className="w-full flex-shrink-0 lg:w-64">
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <h2 className="text-sm font-semibold text-foreground">{t('manifests.filters.title')}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="manifest-filters"
              >
                {filtersOpen ? t('common.hide') : t('common.show')}
              </Button>
            </div>
            <div
              id="manifest-filters"
              className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}
            >
              <ManifestFilters
                values={filters}
                onChange={setFilters}
                manifestCount={meta?.total ?? 0}
              />
            </div>
          </div>

          {/* Manifest List */}
          <div className="flex-1">
            <ManifestList
              projectId={projectId}
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
            />
          </div>
        </div>
      </div>

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




