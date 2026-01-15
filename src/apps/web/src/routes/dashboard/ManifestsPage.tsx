'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useManifests } from '@/hooks/use-manifests';
import { useExportSelectedToCsv } from '@/hooks/use-manifests';
import { ManifestList } from '@/components/manifests/ManifestList';
import { ManifestFilters, ManifestFilterValues } from '@/components/manifests/ManifestFilters';
import { AuditPanel } from '@/components/manifests/AuditPanel';

export default function ManifestsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);
  const groupId = Number(params.groupId);

  const { data: manifests, isLoading } = useManifests(groupId);
  const exportSelectedToCsv = useExportSelectedToCsv();

  const [selectedManifestId, setSelectedManifestId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<ManifestFilterValues>({});
  const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' }>({
    field: 'filename',
    order: 'asc',
  });

  const handleBackToGroups = () => {
    router.push(`/projects/${projectId}`);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
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
            className="text-sm text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back to Project
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Manifests</h1>
          <p className="mt-1 text-sm text-gray-600">
            {manifests?.length ?? 0} invoice{manifests?.length !== 1 ? 's' : ''} in this group
          </p>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <ManifestFilters
              values={filters}
              onChange={setFilters}
              manifestCount={manifests?.length ?? 0}
            />
          </div>

          {/* Manifest List */}
          <div className="flex-1">
            {selectedManifestId ? (
              <AuditPanel
                manifestId={selectedManifestId}
                onClose={handleCloseAudit}
                allManifestIds={manifests?.map((m: { id: number }) => m.id) ?? []}
              />
            ) : (
              <ManifestList
                manifests={manifests ?? []}
                filters={filters}
                sort={sort}
                onViewModeChange={setViewMode}
                onSortChange={setSort}
                onSelectManifest={handleSelectManifest}
                viewMode={viewMode}
                onBatchExport={handleBatchExport}
                onBatchReExtract={handleBatchReExtract}
                projectId={projectId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
