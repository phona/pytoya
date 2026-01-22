import { useEffect, useState } from 'react';
import { manifestsApi } from '@/api/manifests';

interface PdfViewerProps {
  manifestId: number;
}

export function PdfViewer({ manifestId }: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    let urlToRevoke: string | null = null;

    const run = async () => {
      setLoadError(null);
      setObjectUrl(null);
      try {
        const blob = await manifestsApi.getPdfFileBlob(manifestId);
        if (canceled) return;
        const nextUrl = URL.createObjectURL(blob);
        urlToRevoke = nextUrl;
        setObjectUrl(nextUrl);
      } catch (error) {
        if (canceled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load PDF');
      }
    };

    void run();

    return () => {
      canceled = true;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [manifestId]);

  return (
    <div className="h-full flex flex-col bg-muted">
      {/* PDF Container */}
      <div className="flex-1 overflow-hidden relative">
        {loadError ? (
          <div className="h-full w-full flex items-center justify-center p-6 text-sm text-destructive">
            {loadError}
          </div>
        ) : !objectUrl ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          </div>
        ) : (
          <embed
            src={objectUrl}
            type="application/pdf"
            className="w-full h-full"
            title="PDF Viewer"
          />
        )}
      </div>
    </div>
  );
}




