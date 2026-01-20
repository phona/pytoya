import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { manifestsApi } from '@/api/manifests';
import { Button } from '@/shared/components/ui/button';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';

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
  const { alert, ModalDialog } = useModalDialog();
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
      const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
      if (!isJsdom) {
        link.click();
      }
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      void alert({ title: 'Export failed', message: 'Export failed. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = isExporting || (!filters && !selectedIds);

  return (
    <>
      <Button
        type="button"
        onClick={handleExport}
        disabled={isDisabled}
        variant="secondary"
      >
        {isExporting ? (
          <>
            <Loader2 className="-ml-1 mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="-ml-1 mr-2 h-4 w-4" />
            Export CSV
          </>
        )}
      </Button>
      <ModalDialog />
    </>
  );
}




