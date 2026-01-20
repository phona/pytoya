import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { useManifest, useManifestItems, useUpdateManifest, useReExtractField } from '@/shared/hooks/use-manifests';
import { useWebSocket, JobUpdateEvent, ManifestUpdateEvent } from '@/shared/hooks/use-websocket';
import { useRunValidation } from '@/shared/hooks/use-validation-scripts';
import { useExtractors } from '@/shared/hooks/use-extractors';
import { PdfViewer } from './PdfViewer';
import { EditableForm } from './EditableForm';
import { OcrViewer } from './OcrViewer';
import { ProgressBar } from './ProgressBar';
import { ValidationResultsPanel } from '@/shared/components/ValidationResultsPanel';
import { CostBreakdownPanel } from '@/shared/components/CostBreakdownPanel';
import { OcrPreviewModal } from './OcrPreviewModal';
import { ExtractionHistoryPanel, ExtractionHistoryEntry } from './ExtractionHistoryPanel';
import { Manifest } from '@/api/manifests';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';

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
  const { extractors } = useExtractors();

  const [activeTab, setActiveTab] = useState<'form' | 'extraction' | 'ocr' | 'validation' | 'ocrPreview' | 'history'>('form');
  const [currentIndex, setCurrentIndex] = useState(allManifestIds.indexOf(manifestId));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [jobProgress, setJobProgress] = useState<{ progress: number; status: string; error?: string } | null>(null);
  const [showOcrPreviewModal, setShowOcrPreviewModal] = useState(false);

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
      <div className="bg-card rounded-lg shadow-sm border border-border p-8 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  const currentManifestId = allManifestIds[currentIndex];
  if (currentManifestId !== manifestId) {
    // Update the manifestId when navigating
    window.location.href = window.location.pathname.replace(/\/\d+$/, `/${currentManifestId}`);
    return null;
  }

  const validationStatus: Manifest['status'] | null = manifest.validationResults
    ? manifest.validationResults.errorCount > 0
      ? ('failed' as Manifest['status'])
      : manifest.validationResults.warningCount > 0
        ? ('pending' as Manifest['status'])
        : ('completed' as Manifest['status'])
    : null;

  const validationLabel = manifest.validationResults
    ? manifest.validationResults.errorCount > 0
      ? `${manifest.validationResults.errorCount} errors`
      : manifest.validationResults.warningCount > 0
        ? `${manifest.validationResults.warningCount} warnings`
        : 'Passed'
    : '';

  const currentExtractor = manifest.textExtractorId
    ? extractors.find((extractor) => extractor.id === manifest.textExtractorId)
    : undefined;
  const extractorCurrency = (currentExtractor?.config as { pricing?: { currency?: string } } | undefined)?.pricing?.currency;

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{manifest.originalFilename}</h2>
          <p className="text-sm text-muted-foreground">{manifest.storagePath}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <span
              className={`text-sm ${
                saveStatus === 'saved'
                  ? 'text-[color:var(--status-completed-text)]'
                  : saveStatus === 'error'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }`}
            >
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Failed' : 'Saving...'}
            </span>
          )}

          {/* Navigation */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="p-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {allManifestIds.length}
          </span>
          <button
            onClick={goToNext}
            disabled={currentIndex === allManifestIds.length - 1}
            className="p-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded border border-border hover:bg-muted"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('form')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'form'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Invoice Form
            </button>
            <button
              onClick={() => setActiveTab('extraction')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'extraction'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Extraction
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'ocr'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              OCR Results
            </button>
            <button
              onClick={() => setActiveTab('ocrPreview')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'ocrPreview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-3 w-3" />
              OCR Preview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Extraction History
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'validation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Validation
              {manifest.validationResults && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                    validationStatus ? getStatusBadgeClasses(validationStatus) : ''
                  }`}
                >
                  {validationLabel}
                </span>
              )}
            </button>
          </div>
          {activeTab === 'validation' && (
            <button
              onClick={() => runValidation.mutate({ manifestId })}
              disabled={runValidation.isPending}
              className="px-3 py-1 text-sm font-medium rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {runValidation.isPending ? 'Running...' : 'Run Validation'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col gap-6 lg:flex-row lg:gap-0">
        {/* Progress Overlay */}
        {(manifest.status === 'processing' || jobProgress) && (
          <div className="absolute inset-0 z-[var(--z-index-overlay)] bg-card/90 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">
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
                <p className="mt-4 text-sm text-destructive">{jobProgress.error}</p>
              )}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="w-full min-h-0 border-border lg:w-1/2 lg:border-r">
          <PdfViewer manifestId={manifest.id} />
        </div>

        {/* Form/OCR Panel */}
        <div className="w-full min-h-0 overflow-y-auto lg:w-1/2">
          {activeTab === 'form' ? (
            <EditableForm
              manifest={manifest}
              items={items ?? []}
              onSave={handleAutoSave}
              onReExtractField={handleReExtractField}
            />
          ) : activeTab === 'extraction' ? (
            <div className="p-6 space-y-4">
              <div className="rounded-md border border-border p-4">
                <div className="text-sm font-medium text-foreground">Extractor</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {currentExtractor?.name ?? manifest.textExtractorId ?? 'Not selected'}
                </div>
                {currentExtractor && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Type: {currentExtractor.extractorType} • {currentExtractor.isActive ? 'Active' : 'Inactive'}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="text-sm font-medium text-foreground">Processing</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Text processed: {manifest.ocrProcessedAt ? new Date(manifest.ocrProcessedAt).toLocaleString() : 'N/A'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  OCR quality score: {manifest.ocrQualityScore ?? 'N/A'}
                </div>
              </div>
              <CostBreakdownPanel
                textCost={undefined}
                llmCost={undefined}
                totalCost={manifest.extractionCost ?? undefined}
                currency={extractorCurrency}
              />
            </div>
          ) : activeTab === 'ocrPreview' ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">OCR Result Preview</h3>
                <button
                  onClick={() => setShowOcrPreviewModal(true)}
                  className="px-3 py-1 text-xs font-medium border border-border rounded hover:bg-muted"
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  Open Full Preview
                </button>
              </div>
              <OcrViewer manifest={manifest} />
            </div>
          ) : activeTab === 'history' ? (
            <div className="p-6">
              <ExtractionHistoryPanel
                manifestId={manifest.id}
                manifestName={manifest.originalFilename}
                history={((manifest as unknown as { extractionHistory?: ExtractionHistoryEntry[] }).extractionHistory) ?? []}
              />
            </div>
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

      {/* OCR Preview Modal */}
      <OcrPreviewModal
        manifestId={manifest.id}
        open={showOcrPreviewModal}
        onClose={() => setShowOcrPreviewModal(false)}
      />
    </div>
  );
}
