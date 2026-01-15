import { useEffect, useRef, useState } from 'react';
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
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-sm text-gray-600 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded hover:bg-gray-100"
          title="Zoom In"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
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
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
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
