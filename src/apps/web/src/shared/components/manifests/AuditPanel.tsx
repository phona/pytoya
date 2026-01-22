import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import {
  useManifest,
  useUpdateManifest,
  useManifestExtractionHistory,
  useReExtractFieldPreview,
} from '@/shared/hooks/use-manifests';
import { useWebSocket, JobUpdateEvent, ManifestUpdateEvent } from '@/shared/hooks/use-websocket';
import { useRunValidation } from '@/shared/hooks/use-validation-scripts';
import { useExtractors } from '@/shared/hooks/use-extractors';
import { useOcrResult } from '@/shared/hooks/use-manifests';
import { getApiErrorMessage } from '@/api/client';
import { jobsApi } from '@/api/jobs';
import { schemasApi } from '@/api/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useGroups, useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas, useSchema } from '@/shared/hooks/use-schemas';
import { deriveExtractionHintMap } from '@/shared/utils/schema';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { PdfViewer } from './PdfViewer';
import { EditableForm } from './EditableForm';
import { OcrViewer } from './OcrViewer';
import { ProgressBar } from './ProgressBar';
import { ValidationResultsPanel } from '@/shared/components/ValidationResultsPanel';
import { CostBreakdownPanel } from '@/shared/components/CostBreakdownPanel';
import { OcrPreviewModal } from './OcrPreviewModal';
import { ExtractionHistoryPanel } from './ExtractionHistoryPanel';
import { FieldHintDialog } from './FieldHintDialog';
import { Manifest } from '@/api/manifests';
import { toast } from '@/shared/hooks/use-toast';
import { AuditPanelFunctionsMenu } from './AuditPanelFunctionsMenu';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';

interface AuditPanelProps {
  projectId: number;
  groupId: number;
  manifestId: number;
  onClose: () => void;
  allManifestIds: number[];
}

export function AuditPanel({ projectId, groupId, manifestId, onClose, allManifestIds }: AuditPanelProps) {
  const queryClient = useQueryClient();
  const { data: manifest, isLoading } = useManifest(manifestId);
  const updateManifest = useUpdateManifest();
  const runValidation = useRunValidation();
  const reExtractFieldWithPreview = useReExtractFieldPreview();
  const { extractors } = useExtractors();
  const { project } = useProject(projectId);
  const { groups } = useGroups(projectId);
  const groupLabel = groups.find((group) => group.id === groupId)?.name ?? `Group ${groupId}`;
  const projectLabel = project?.name ?? `Project ${projectId}`;
  const { schemas: projectSchemas } = useProjectSchemas(projectId);
  const resolvedSchemaId = useMemo(() => {
    const defaultSchemaId = project?.defaultSchemaId ?? null;
    if (defaultSchemaId && projectSchemas.some((schema) => schema.id === defaultSchemaId)) {
      return defaultSchemaId;
    }
    return projectSchemas[0]?.id ?? defaultSchemaId ?? 0;
  }, [project?.defaultSchemaId, projectSchemas]);
  const { schema } = useSchema(resolvedSchemaId);
  const jsonSchema = useMemo(() => {
    const raw = schema?.jsonSchema;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined;
    }
    return raw as Record<string, unknown>;
  }, [schema?.jsonSchema]);
  const extractionHintMap = useMemo(() => {
    if (!jsonSchema) {
      return {};
    }
    return deriveExtractionHintMap(jsonSchema);
  }, [jsonSchema]);

  const [activeTab, setActiveTab] = useState<'form' | 'extraction' | 'ocr' | 'validation' | 'history'>('form');
  const [currentIndex, setCurrentIndex] = useState(allManifestIds.indexOf(manifestId));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [jobProgress, setJobProgress] = useState<{ jobId?: string; progress: number; status: string; error?: string } | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showOcrPreviewModal, setShowOcrPreviewModal] = useState(false);
  const [fieldHistoryOpen, setFieldHistoryOpen] = useState(false);
  const [historyFieldFilter, setHistoryFieldFilter] = useState<string | null>(null);
  const [fieldHintEditor, setFieldHintEditor] = useState<{
    open: boolean;
    fieldPath: string;
  } | null>(null);
  const { data: ocrData, isLoading: isOcrLoading, error: ocrError } = useOcrResult(manifestId, activeTab === 'ocr');
  const { data: extractionHistory, isLoading: isHistoryLoading } = useManifestExtractionHistory(manifestId, {
    enabled: activeTab === 'history' || fieldHistoryOpen,
    limit: 50,
  });

  const handleTerminalJobStatus = useCallback(
    async (status: string) => {
      const normalized = status.toLowerCase();
      if (!['completed', 'failed', 'canceled'].includes(normalized)) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manifests', manifestId] }),
        queryClient.invalidateQueries({ queryKey: ['manifests', 'group'] }),
      ]);

      // Stop blocking the UI once the job is done.
      setJobProgress(null);
    },
    [manifestId, queryClient],
  );

  // WebSocket integration
  const { subscribeToManifest, unsubscribeFromManifest } = useWebSocket({
    onJobUpdate: useCallback((data: JobUpdateEvent) => {
      if (data.manifestId === manifestId) {
        setJobProgress({
          jobId: data.jobId,
          progress: data.progress,
          status: data.status,
          error: data.error,
        });
        void handleTerminalJobStatus(data.status);
      }
    }, [handleTerminalJobStatus, manifestId]),
    onManifestUpdate: useCallback((data: ManifestUpdateEvent) => {
      if (data.manifestId === manifestId) {
        setJobProgress((prev) => ({
          jobId: prev?.jobId,
          progress: data.progress,
          status: data.status,
          error: data.error,
        }));
        void handleTerminalJobStatus(data.status);
      }
    }, [handleTerminalJobStatus, manifestId]),
  });

  const handleCancelExtraction = useCallback(async () => {
    if (!jobProgress?.jobId) {
      return;
    }
    setIsCanceling(true);
    try {
      await jobsApi.cancelJob(jobProgress.jobId);
      setJobProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'canceling',
            }
          : prev,
      );
    } finally {
      setIsCanceling(false);
    }
  }, [jobProgress?.jobId]);

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
          // If a modal dialog is open (field history, OCR preview, etc.),
          // let it handle Escape first instead of closing the whole audit panel.
          if (document.querySelector('[data-state="open"][role="dialog"]')) {
            break;
          }
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

  const normalizeHintPath = useCallback((path: string) => path.replace(/\[(\d+)\]/g, '[]'), []);

  const getReExtractTargetField = useCallback((normalizedPath: string): string => {
    const parts = normalizedPath.split('.').filter(Boolean);
    const arrayIndex = parts.findIndex((part) => part.endsWith('[]'));
    if (arrayIndex === -1) {
      return normalizedPath;
    }
    const prefixParts = parts.slice(0, arrayIndex + 1);
    prefixParts[prefixParts.length - 1] = prefixParts[prefixParts.length - 1].replace(/\[\]$/, '');
    return prefixParts.join('.');
  }, []);

  const handleReExtractField = useCallback(
    async (fieldName: string) => {
      const trimmed = fieldName.trim();
      if (!trimmed) {
        return;
      }

      const normalized = normalizeHintPath(trimmed);
      const targetFieldName = getReExtractTargetField(normalized);

      try {
        const result = await reExtractFieldWithPreview.mutateAsync({
          manifestId,
          data: {
            fieldName: targetFieldName,
            includeOcrContext: true,
            previewOnly: false,
          },
        });

        if (result.jobId) {
          setJobProgress({ jobId: result.jobId, progress: 0, status: 'queued' });
        }

        toast({
          title: 'Re-extract queued',
          description: targetFieldName,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Re-extract failed',
          description: getApiErrorMessage(error, 'Unable to re-extract field. Please try again.'),
        });
      }
    },
    [getReExtractTargetField, manifestId, normalizeHintPath, reExtractFieldWithPreview],
  );

  const handleViewExtractionHistory = useCallback(
    (fieldPath: string) => {
      const trimmed = fieldPath.trim();
      if (!trimmed) {
        return;
      }

      const normalized = normalizeHintPath(trimmed);
      const targetFieldName = getReExtractTargetField(normalized);
      setHistoryFieldFilter(targetFieldName);
      setFieldHistoryOpen(true);
    },
    [getReExtractTargetField, normalizeHintPath],
  );

  const handleEditFieldHint = useCallback((fieldPath: string) => {
    setFieldHintEditor({ open: true, fieldPath });
  }, []);

  const handleUpdateFieldHint = useCallback(
    async (nextSchema: Record<string, unknown>) => {
      if (!resolvedSchemaId) {
        throw new Error('Schema is not available');
      }

      await schemasApi.updateSchema(resolvedSchemaId, { jsonSchema: nextSchema });

      queryClient.setQueryData(['schema', resolvedSchemaId], (prev) => {
        if (!prev || typeof prev !== 'object') {
          return prev;
        }
        return { ...(prev as Record<string, unknown>), jsonSchema: nextSchema };
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schema', resolvedSchemaId] }),
        queryClient.invalidateQueries({ queryKey: ['schemas', 'project', projectId] }),
      ]);
    },
    [projectId, queryClient, resolvedSchemaId],
  );

  if (isLoading || !manifest) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex justify-between items-center flex-shrink-0">
        <div className="min-w-0">
          <AppBreadcrumbs
            className="mb-1"
            items={[
              { label: 'Projects', to: '/projects' },
              { label: projectLabel, to: `/projects/${projectId}` },
              {
                label: `Manifests (${groupLabel})`,
                to: `/projects/${projectId}/groups/${groupId}/manifests`,
              },
              { label: manifest.originalFilename },
            ]}
          />
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

          <AuditPanelFunctionsMenu
            activeTab={activeTab}
            onTabChange={setActiveTab}
            runValidationPending={runValidation.isPending}
            onRunValidation={() => {
              setActiveTab('validation');
              runValidation.mutate({ manifestId: manifest.id });
            }}
            validationLabel={validationLabel}
            validationStatus={validationStatus}
          />

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

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="relative flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Progress Overlay */}
        {(manifest.status === 'processing' || jobProgress?.status === 'processing' || jobProgress?.status === 'canceling') && (
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
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleCancelExtraction}
                  disabled={isCanceling || !jobProgress?.jobId || jobProgress?.status !== 'processing'}
                  className="px-3 py-1 text-sm font-medium rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  title={jobProgress?.jobId ? 'Cancel extraction job' : 'Waiting for job id...'}
                >
                  {isCanceling ? 'Canceling...' : 'Cancel'}
                </button>
              </div>
              {jobProgress?.error && (
                <p className="mt-4 text-sm text-destructive">{jobProgress.error}</p>
              )}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="w-full min-h-0 overflow-hidden border-border lg:w-1/2 lg:border-r">
          <PdfViewer manifestId={manifest.id} />
        </div>

        {/* Form/OCR Panel */}
        <div className="w-full min-h-0 overflow-y-auto lg:w-1/2">
          {activeTab === 'form' ? (
            <EditableForm
              manifest={manifest}
              jsonSchema={jsonSchema}
              extractionHintMap={extractionHintMap}
              onSave={handleAutoSave}
              onReExtractField={handleReExtractField}
              onViewExtractionHistory={handleViewExtractionHistory}
              onEditFieldHint={jsonSchema && resolvedSchemaId ? handleEditFieldHint : undefined}
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
          ) : activeTab === 'ocr' ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Text Extraction Summary</div>
                  <div className="text-xs text-muted-foreground">
                    Processed: {manifest.ocrProcessedAt ? new Date(manifest.ocrProcessedAt).toLocaleString() : 'N/A'} • Quality:{' '}
                    {manifest.ocrQualityScore ?? 'N/A'}
                  </div>
                </div>
                <button
                  onClick={() => setShowOcrPreviewModal(true)}
                  className="px-3 py-1 text-xs font-medium border border-border rounded hover:bg-muted"
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  Open Text Details
                </button>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm font-medium text-foreground mb-2">Cached Text (full)</div>
                {isOcrLoading && <p className="text-sm text-muted-foreground">Loading text...</p>}
                {ocrError && <p className="text-sm text-destructive">Failed to load cached text.</p>}
                {!isOcrLoading && !ocrError && !ocrData?.ocrResult && (
                  <p className="text-sm text-muted-foreground">
                    No cached text found. Click “Open Text Details” and run text extraction.
                  </p>
                )}
                {ocrData?.ocrResult && (
                  <pre className="text-xs text-foreground whitespace-pre-wrap font-mono max-h-64 overflow-y-auto bg-background border border-border rounded p-3">
                    {(ocrData.ocrResult.pages ?? [])
                      .map((page) => page.markdown || page.text)
                      .join('\n')
                      .trim()}
                  </pre>
                )}
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm font-medium text-foreground mb-2">Extraction Diagnostics</div>
                <OcrViewer manifest={manifest} />
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="p-6">
              {historyFieldFilter ? (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Filtering by field: <span className="font-medium text-foreground">{historyFieldFilter}</span>
                  </div>
                  <button
                    onClick={() => setHistoryFieldFilter(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear filter
                  </button>
                </div>
              ) : null}
              <ExtractionHistoryPanel
                manifestId={manifest.id}
                manifestName={manifest.originalFilename}
                history={(extractionHistory ?? []).filter((entry) => !historyFieldFilter || entry.fieldName === historyFieldFilter)}
                loading={isHistoryLoading}
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
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="px-3 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Previous (←)"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === allManifestIds.length - 1}
            className="px-3 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Next (→)"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {allManifestIds.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-2 rounded border border-border hover:bg-muted"
          title="Close (Esc)"
        >
          Back to Manifests
        </button>
      </div>

      {/* OCR Preview Modal */}
      <OcrPreviewModal
        manifestId={manifest.id}
        open={showOcrPreviewModal}
        onClose={() => setShowOcrPreviewModal(false)}
      />

      <Dialog open={fieldHistoryOpen} onOpenChange={setFieldHistoryOpen}>
        <DialogSideContent>
          <DialogHeader>
            <DialogTitle>
              Field Extraction History{historyFieldFilter ? `: ${historyFieldFilter}` : ''}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View extraction run history for this field.
            </DialogDescription>
          </DialogHeader>

          <ExtractionHistoryPanel
            manifestId={manifest.id}
            manifestName={manifest.originalFilename}
            history={
              historyFieldFilter
                ? (extractionHistory ?? []).filter((entry) => entry.fieldName === historyFieldFilter)
                : []
            }
            loading={isHistoryLoading}
          />
        </DialogSideContent>
      </Dialog>

      {fieldHintEditor?.open && jsonSchema && resolvedSchemaId ? (
        <FieldHintDialog
          open={fieldHintEditor.open}
          onClose={() => setFieldHintEditor(null)}
          fieldPath={fieldHintEditor.fieldPath}
          jsonSchema={jsonSchema}
          onSubmit={handleUpdateFieldHint}
        />
      ) : null}
    </div>
  );
}
