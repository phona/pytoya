import { useState, useEffect, useCallback } from 'react';
import { useManifest, useManifestItems, useUpdateManifest, useReExtractField } from '@/shared/hooks/use-manifests';
import { useWebSocket, JobUpdateEvent, ManifestUpdateEvent } from '@/shared/hooks/use-websocket';
import { useRunValidation } from '@/shared/hooks/use-validation-scripts';
import { PdfViewer } from './PdfViewer';
import { EditableForm } from './EditableForm';
import { OcrViewer } from './OcrViewer';
import { ProgressBar } from './ProgressBar';
import { ValidationResultsPanel } from '@/shared/components/ValidationResultsPanel';
import { Manifest } from '@/api/manifests';

interface AuditPanelProps {
  manifestId: number;
  onClose: () => void;
  allManifestIds: number[];
}

export function AuditPanel({ manifestId, onClose, allManifestIds }: AuditPanelProps) {
  const { data: manifest, isLoading } = useManifest(manifestId);
  const { data: items } = useManifestItems(manifestId);
  const updateManifest = useUpdateManifest();
  const reExtractField = useReExtractField();
  const runValidation = useRunValidation();

  const [activeTab, setActiveTab] = useState<'form' | 'ocr' | 'validation'>('form');
  const [currentIndex, setCurrentIndex] = useState(allManifestIds.indexOf(manifestId));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [jobProgress, setJobProgress] = useState<{ progress: number; status: string; error?: string } | null>(null);

  // WebSocket integration
  const { subscribeToManifest, unsubscribeFromManifest } = useWebSocket({
    onJobUpdate: useCallback((data: JobUpdateEvent) => {
      if (data.manifestId === manifestId) {
        setJobProgress({
          progress: data.progress,
          status: data.status,
          error: data.error,
        });
      }
    }, [manifestId]),
    onManifestUpdate: useCallback((data: ManifestUpdateEvent) => {
      if (data.manifestId === manifestId) {
        setJobProgress({
          progress: data.progress,
          status: data.status,
          error: data.error,
        });
      }
    }, [manifestId]),
  });

  // Auto-subscribe when panel opens
  useEffect(() => {
    subscribeToManifest(manifestId);
    return () => {
      unsubscribeFromManifest(manifestId);
    };
  }, [manifestId, subscribeToManifest, unsubscribeFromManifest]);

  // Navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < allManifestIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, allManifestIds.length]);

  const handleSave = useCallback(async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    // Trigger immediate save - the form will call this
    setSaveStatus('saving');
  }, [debounceTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSave();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, handleSave, onClose]);

  // Auto-save with debouncing
  const handleAutoSave = useCallback(
    (data: Partial<Manifest>) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      setSaveStatus('saving');

      const timer = setTimeout(async () => {
        try {
          await updateManifest.mutateAsync({
            manifestId,
            data: {
              extractedData: data.extractedData ?? undefined,
              confidence: data.confidence ?? undefined,
              purchaseOrder: data.purchaseOrder ?? undefined,
              invoiceDate: data.invoiceDate ?? undefined,
              department: data.department ?? undefined,
              humanVerified: data.humanVerified,
            },
          });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }, 1000);

      setDebounceTimer(timer);
    },
    [manifestId, updateManifest, debounceTimer],
  );

  const handleReExtractField = async (fieldName: string) => {
    try {
      await reExtractField.mutateAsync({ manifestId, fieldName });
    } catch (error) {
      console.error('Re-extraction failed:', error);
    }
  };

  if (isLoading || !manifest) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  const currentManifestId = allManifestIds[currentIndex];
  if (currentManifestId !== manifestId) {
    // Update the manifestId when navigating
    window.location.href = window.location.pathname.replace(/\/\d+$/, `/${currentManifestId}`);
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{manifest.originalFilename}</h2>
          <p className="text-sm text-gray-500">{manifest.storagePath}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <span
              className={`text-sm ${
                saveStatus === 'saved'
                  ? 'text-green-600'
                  : saveStatus === 'error'
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Failed' : 'Saving...'}
            </span>
          )}

          {/* Navigation */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous (←)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600">
            {currentIndex + 1} / {allManifestIds.length}
          </span>
          <button
            onClick={goToNext}
            disabled={currentIndex === allManifestIds.length - 1}
            className="p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next (→)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded border border-gray-300 hover:bg-gray-50"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('form')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'form'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invoice Form
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'ocr'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              OCR Results
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'validation'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Validation
              {manifest.validationResults && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                    manifest.validationResults.errorCount > 0
                      ? 'bg-red-100 text-red-800'
                      : manifest.validationResults.warningCount > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {manifest.validationResults.errorCount > 0
                    ? `${manifest.validationResults.errorCount} errors`
                    : manifest.validationResults.warningCount > 0
                      ? `${manifest.validationResults.warningCount} warnings`
                      : 'Passed'}
                </span>
              )}
            </button>
          </div>
          {activeTab === 'validation' && (
            <button
              onClick={() => runValidation.mutate({ manifestId })}
              disabled={runValidation.isPending}
              className="px-3 py-1 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runValidation.isPending ? 'Running...' : 'Run Validation'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100vh-300px)] relative">
        {/* Progress Overlay */}
        {(manifest.status === 'processing' || jobProgress) && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {jobProgress?.status === 'processing' ? 'Processing Invoice' : 'Updating'}
              </h3>
              <ProgressBar
                progress={jobProgress?.progress ?? 0}
                status={jobProgress?.status}
                error={jobProgress?.error}
                size="md"
                showLabel={true}
                showStatus={true}
              />
              {jobProgress?.error && (
                <p className="mt-4 text-sm text-red-600">{jobProgress.error}</p>
              )}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="w-1/2 border-r border-gray-200">
          <PdfViewer manifestId={manifest.id} />
        </div>

        {/* Form/OCR Panel */}
        <div className="w-1/2 overflow-y-auto">
          {activeTab === 'form' ? (
            <EditableForm
              manifest={manifest}
              items={items ?? []}
              onSave={handleAutoSave}
              onReExtractField={handleReExtractField}
            />
          ) : activeTab === 'validation' ? (
            <ValidationResultsPanel
              result={manifest.validationResults}
              isLoading={runValidation.isPending}
            />
          ) : (
            <OcrViewer manifest={manifest} />
          )}
        </div>
      </div>
    </div>
  );
}
