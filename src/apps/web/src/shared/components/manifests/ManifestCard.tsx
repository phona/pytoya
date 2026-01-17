import { format } from 'date-fns';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Manifest } from '@/api/manifests';

interface ManifestCardProps {
  manifest: Manifest;
  onClick: () => void;
}

export function ManifestCard({ manifest, onClick }: ManifestCardProps) {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${getConfidenceColor(manifest.confidence)}`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-sm font-medium text-gray-900 truncate flex-1" title={manifest.originalFilename}>
            {manifest.originalFilename}
          </h3>
          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(manifest.status)}`}>
            {manifest.status}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          {manifest.purchaseOrder && (
            <div className="flex justify-between">
              <span className="text-gray-500">PO:</span>
              <span className="text-gray-900">{manifest.purchaseOrder}</span>
            </div>
          )}

          {manifest.invoiceDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span className="text-gray-900">
                {format(new Date(manifest.invoiceDate), 'PP')}
              </span>
            </div>
          )}

          {manifest.department && (
            <div className="flex justify-between">
              <span className="text-gray-500">Dept:</span>
              <span className="text-gray-900">{manifest.department}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-500">Confidence:</span>
            <span className="text-gray-900">
              {manifest.confidence !== null
                ? `${Math.round(manifest.confidence * 100)}%`
                : 'N/A'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Size:</span>
            <span className="text-gray-900">{formatFileSize(manifest.fileSize)}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center">
            {manifest.humanVerified ? (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                <span className="text-xs">Verified</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-400">
                <Clock className="mr-1 h-4 w-4" />
                <span className="text-xs">Pending</span>
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-indigo-600 text-xs font-medium">
            View
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
