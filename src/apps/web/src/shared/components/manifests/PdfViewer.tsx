import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import { manifestsApi } from '@/api/manifests';

interface PdfViewerProps {
  manifestId: number;
}

export function PdfViewer({ manifestId }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleOpenNewTab = () => {
    if (pdfBlob) {
      const nextUrl = URL.createObjectURL(pdfBlob);
      window.open(nextUrl, '_blank');
    }
  };

  useEffect(() => {
    let canceled = false;
    let urlToRevoke: string | null = null;

    const run = async () => {
      setLoadError(null);
      setPdfBlob(null);
      setObjectUrl(null);
      try {
        const blob = await manifestsApi.getPdfFileBlob(manifestId);
        if (canceled) return;
        setPdfBlob(blob);
        const nextUrl = URL.createObjectURL(blob);
        urlToRevoke = nextUrl;
        setObjectUrl(nextUrl);
      } catch (error) {
        if (canceled) return;
        setPdfBlob(null);
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
      {/* Toolbar */}
      <div className="px-4 py-2 bg-card border-b border-border flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-1 rounded hover:bg-muted"
          title="Zoom Out"
        >
          <Minus className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-sm text-muted-foreground min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded hover:bg-muted"
          title="Zoom In"
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1 rounded hover:bg-muted text-sm text-muted-foreground"
          title="Reset Zoom"
        >
          Reset
        </button>
        <div className="flex-1" />
        <button
          onClick={handleOpenNewTab}
          disabled={!pdfBlob}
          className="p-1 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          title="Open in New Tab"
        >
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

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
          <iframe
            ref={iframeRef}
            src={`${objectUrl}#view=FitH`}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        )}
      </div>
    </div>
  );
}




