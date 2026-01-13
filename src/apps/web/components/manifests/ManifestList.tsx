import { useMemo, useState, useCallback } from 'react';
import { Manifest } from '@/lib/api/manifests';
import { ManifestFilterValues } from './ManifestFilters';
import { ManifestTable } from './ManifestTable';
import { ManifestCard } from './ManifestCard';
import { Pagination } from './Pagination';

interface ManifestListProps {
  manifests: Manifest[];
  filters: ManifestFilterValues;
  sort: { field: string; order: 'asc' | 'desc' };
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
  onSortChange: (sort: { field: string; order: 'asc' | 'desc' }) => void;
  onSelectManifest: (manifestId: number) => void;
  onBatchExport?: (manifestIds: number[]) => void;
  onBatchReExtract?: (manifestIds: number[]) => void;
}

export function ManifestList({
  manifests,
  filters,
  sort,
  viewMode,
  onViewModeChange,
  onSortChange,
  onSelectManifest,
  onBatchExport,
  onBatchReExtract,
}: ManifestListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
  const filteredAndSortedManifests = useMemo(() => {
    let result = [...manifests];

    // Apply filters
    if (filters.status) {
      result = result.filter((m) => m.status === filters.status);
    }
    if (filters.poNo) {
      result = result.filter((m) =>
        m.purchaseOrder?.toLowerCase().includes(filters.poNo!.toLowerCase()),
      );
    }
    if (filters.department) {
      result = result.filter((m) =>
        m.department?.toLowerCase().includes(filters.department!.toLowerCase()),
      );
    }
    if (filters.humanVerified !== undefined) {
      result = result.filter((m) => m.humanVerified === filters.humanVerified);
    }
    if (filters.confidenceMin !== undefined) {
      result = result.filter((m) => (m.confidence ?? 0) >= filters.confidenceMin!);
    }
    if (filters.confidenceMax !== undefined) {
      result = result.filter((m) => (m.confidence ?? 0) <= filters.confidenceMax!);
    }
    if (filters.dateFrom) {
      result = result.filter((m) => m.invoiceDate && m.invoiceDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter((m) => m.invoiceDate && m.invoiceDate <= filters.dateTo!);
    }

    // Apply sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'filename':
          aValue = a.filename;
          bValue = b.filename;
          break;
        case 'poNo':
          aValue = a.purchaseOrder ?? '';
          bValue = b.purchaseOrder ?? '';
          break;
        case 'invoiceDate':
          aValue = a.invoiceDate ?? '';
          bValue = b.invoiceDate ?? '';
          break;
        case 'confidence':
          aValue = a.confidence ?? 0;
          bValue = b.confidence ?? 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sort.order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sort.order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return result;
  }, [manifests, filters, sort]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedManifests.length / pageSize);

  // Reset to page 1 when filters or sort changes
  useMemo(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  const paginatedManifests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedManifests.slice(startIndex, endIndex);
  }, [filteredAndSortedManifests, currentPage, pageSize]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  // Update select all to work with current page
  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedManifests.map((m) => m.id)));
    }
    setSelectAll(!selectAll);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Manifests ({filteredAndSortedManifests.length})
          </h2>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBatchExport}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Export CSV
              </button>
              <button
                onClick={handleBatchReExtract}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Re-extract
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages || 1}
          </div>
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                viewMode === 'table'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-600 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('card')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg border -ml-px ${
                viewMode === 'card'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-600 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedManifests.length === 0 ? (
        <div className="p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No manifests found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters to see more results.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <ManifestTable
              manifests={paginatedManifests}
              sort={sort}
              onSortChange={onSortChange}
              onSelectManifest={onSelectManifest}
              selectedIds={selectedIds}
              onSelectToggle={handleToggleSelect}
              onSelectAll={handleToggleSelectAll}
              selectAll={selectAll}
            />
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedManifests.map((manifest) => (
                <ManifestCard
                  key={manifest.id}
                  manifest={manifest}
                  onClick={() => onSelectManifest(manifest.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedManifests.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredAndSortedManifests.length}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>
  );
}
