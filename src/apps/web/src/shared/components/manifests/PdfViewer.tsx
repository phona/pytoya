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
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-1 rounded hover:bg-gray-100"
          title="Zoom Out"
        >
          <Minus className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-sm text-gray-600 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded hover:bg-gray-100"
          title="Zoom In"
        >
          <Plus className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1 rounded hover:bg-gray-100 text-sm text-gray-600"
          title="Reset Zoom"
        >
          Reset
        </button>
        <div className="flex-1" />
        <button
          onClick={handleOpenNewTab}
          className="p-1 rounded hover:bg-gray-100"
          title="Open in New Tab"
        >
          <ExternalLink className="h-5 w-5 text-gray-600" />
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
