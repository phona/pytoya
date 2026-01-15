import { Manifest } from '@/api/manifests';
import { ProgressBar } from './ProgressBar';

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
}: ManifestTableProps) {
  const handleSort = (field: string) => {
    if (sort.field === field) {
      onSortChange({ field, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field, order: 'asc' });
    }
  };

  const getSortIcon = (field: string) => {
    if (sort.field !== field) return null;
    return sort.order === 'asc' ? '↑' : '↓';
  };

  const getStatusColor = (status: Manifest['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'border-gray-300';
    if (confidence >= 0.9) return 'border-green-500';
    if (confidence >= 0.7) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onSelectAll && (
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectAll ?? false}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
            )}
            <th
              onClick={() => handleSort('filename')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Filename {getSortIcon('filename')}
            </th>
            <th
              onClick={() => handleSort('status')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Status {getSortIcon('status')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th
              onClick={() => handleSort('poNo')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              PO No {getSortIcon('poNo')}
            </th>
            <th
              onClick={() => handleSort('invoiceDate')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Invoice Date {getSortIcon('invoiceDate')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th
              onClick={() => handleSort('confidence')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Confidence {getSortIcon('confidence')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Verified
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {manifests.map((manifest) => (
            <tr
              key={manifest.id}
              className={`hover:bg-gray-50 cursor-pointer border-l-4 ${getConfidenceColor(manifest.confidence)}`}
            >
              {onSelectToggle && (
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(manifest.id) ?? false}
                    onChange={() => onSelectToggle(manifest.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap" onClick={() => onSelectManifest(manifest.id)}>
                <div className="text-sm font-medium text-gray-900">{manifest.originalFilename}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap" onClick={() => onSelectManifest(manifest.id)}>
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(manifest.status)}`}>
                  {manifest.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                {(manifest.status === 'processing' || manifestProgress?.[manifest.id]) ? (
                  <div className="w-32">
                    <ProgressBar
                      progress={manifestProgress?.[manifest.id]?.progress ?? 0}
                      status={manifestProgress?.[manifest.id]?.status}
                      error={manifestProgress?.[manifest.id]?.error}
                      size="sm"
                      showLabel={false}
                      showStatus={false}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={() => onSelectManifest(manifest.id)}>
                {manifest.purchaseOrder ?? 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={() => onSelectManifest(manifest.id)}>
                {manifest.invoiceDate ?? 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={() => onSelectManifest(manifest.id)}>
                {manifest.department ?? 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={() => onSelectManifest(manifest.id)}>
                {manifest.confidence !== null
                  ? `${Math.round(manifest.confidence * 100)}%`
                  : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap" onClick={() => onSelectManifest(manifest.id)}>
                {manifest.humanVerified ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectManifest(manifest.id);
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
