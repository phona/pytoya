import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { manifestsApi } from '@/api/manifests';

interface ExportButtonProps {
  filters?: {
    status?: string;
    groupId?: number;
    projectId?: number;
    poNo?: string;
    department?: string;
    dateFrom?: string;
    dateTo?: string;
    humanVerified?: boolean;
    confidenceMin?: number;
    confidenceMax?: number;
  };
  selectedIds?: number[];
  filename?: string;
}

export function ExportButton({ filters, selectedIds, filename }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let blob: Blob;
      if (selectedIds && selectedIds.length > 0) {
        blob = await manifestsApi.exportSelectedToCsv(selectedIds);
      } else {
        blob = await manifestsApi.exportToCsv(filters);
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `manifests-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = isExporting || (!filters && !selectedIds);

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <Loader2 className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="-ml-1 mr-2 h-4 w-4 text-white" />
          Export CSV
        </>
      )}
    </button>
  );
}
