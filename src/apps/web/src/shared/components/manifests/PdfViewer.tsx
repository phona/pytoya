import { useRef, useState } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import { manifestsApi } from '@/api/manifests';

interface PdfViewerProps {
  manifestId: number;
}

export function PdfViewer({ manifestId }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(1);

  const pdfUrl = manifestsApi.getPdfUrl(manifestId);

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
    window.open(pdfUrl, '_blank');
  };

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
          className="p-1 rounded hover:bg-muted"
          title="Open in New Tab"
        >
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-hidden relative">
        <iframe
          ref={iframeRef}
          src={`${pdfUrl}#view=FitH`}
          className="w-full h-full border-0"
          title="PDF Viewer"
        />
      </div>
    </div>
  );
}




