import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useManifests } from '@/shared/hooks/use-manifests';
import { useExportSelectedToCsv } from '@/shared/hooks/use-manifests';
import { useQueryClient } from '@tanstack/react-query';
import { ManifestList } from '@/shared/components/manifests/ManifestList';
import { ManifestFilters } from '@/shared/components/manifests/ManifestFilters';
import { AuditPanel } from '@/shared/components/manifests/AuditPanel';
import { UploadDialog } from '@/shared/components/UploadDialog';
import { ManifestFilterValues, ManifestSort } from '@/shared/types/manifests';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function ManifestsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const groupId = Number(params.groupId);
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const exportSelectedToCsv = useExportSelectedToCsv();

  const [selectedManifestId, setSelectedManifestId] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<ManifestFilterValues>({});
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

  const handleBackToGroups = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleSelectManifest = (manifestId: number) => {
    setSelectedManifestId(manifestId);
  };

  const handleCloseAudit = () => {
    setSelectedManifestId(null);
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
    console.log('Re-extracting manifests:', manifestIds);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-4 w-32" />
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToGroups}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manifests</h1>
              <p className="mt-1 text-sm text-gray-600">
                {meta?.total ?? 0} invoice{meta?.total !== 1 ? 's' : ''} in this group
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Upload Manifests
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <ManifestFilters
              values={filters}
              onChange={setFilters}
              manifestCount={meta?.total ?? 0}
            />
          </div>

          {/* Manifest List */}
          <div className="flex-1">
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
            />
          </div>
        </div>
      </div>

      <Dialog
        open={selectedManifestId !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAudit();
          }
        }}
      >
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Manifest Audit</DialogTitle>
            <DialogDescription className="sr-only">
              Review extracted data and audit details for the selected manifest.
            </DialogDescription>
          </DialogHeader>
          {selectedManifestId ? (
            <AuditPanel
              manifestId={selectedManifestId}
              onClose={handleCloseAudit}
              allManifestIds={manifests.map((m: { id: number }) => m.id)}
            />
          ) : null}
        </DialogContent>
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
