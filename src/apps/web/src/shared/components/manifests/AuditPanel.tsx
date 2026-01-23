import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Eye, Play, Save } from 'lucide-react';
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
import { getApiErrorText } from '@/api/client';
import { manifestsApi } from '@/api/manifests';
import { schemasApi } from '@/api/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useGroups, useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas, useSchema } from '@/shared/hooks/use-schemas';
import { deriveExtractionHintMap } from '@/shared/utils/schema';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { PdfViewer } from './PdfViewer';
import { EditableForm } from './EditableForm';
import { OcrViewer } from './OcrViewer';
import { ValidationResultsPanel } from '@/shared/components/ValidationResultsPanel';
import { CostBreakdownPanel } from '@/shared/components/CostBreakdownPanel';
import { OcrPreviewModal } from './OcrPreviewModal';
import { ExtractionHistoryPanel } from './ExtractionHistoryPanel';
import { FieldHintDialog } from './FieldHintDialog';
import { Manifest, ValidationResult } from '@/api/manifests';
import { toast } from '@/shared/hooks/use-toast';
import { AuditPanelFunctionsMenu } from './AuditPanelFunctionsMenu';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { ToastAction } from '@/shared/components/ui/toast';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';
import { useJobsStore } from '@/shared/stores/jobs';
import { useUiStore } from '@/shared/stores/ui';

interface AuditPanelProps {
  projectId: number;
  groupId: number;
  manifestId: number;
  onClose: () => void;
  allManifestIds: number[];
}

export function AuditPanel({ projectId, groupId, manifestId, onClose, allManifestIds }: AuditPanelProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: manifest, isLoading } = useManifest(manifestId);
  const updateManifest = useUpdateManifest();
  const runValidation = useRunValidation();
  const { confirm, ModalDialog } = useModalDialog();
  const reExtractFieldWithPreview = useReExtractFieldPreview();
  const { extractors } = useExtractors();
  const { project } = useProject(projectId);
  const { groups } = useGroups(projectId);
  const groupLabel =
    groups.find((group) => group.id === groupId)?.name ?? t('groups.fallbackName', { id: groupId });
  const projectLabel = project?.name ?? t('projects.fallbackName', { id: projectId });
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
  const currentIndex = useMemo(() => allManifestIds.indexOf(manifestId), [allManifestIds, manifestId]);
  const displayIndex = currentIndex >= 0 ? currentIndex + 1 : 1;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [explicitSavePending, setExplicitSavePending] = useState(false);
  const [formResetCounter, setFormResetCounter] = useState(0);
  const [jobProgress, setJobProgress] = useState<{ jobId?: string; progress: number; status: string; error?: string } | null>(null);
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
  const latestDraftRef = useRef<Partial<Manifest> | null>(null);

  useEffect(() => {
    latestDraftRef.current = null;
  }, [manifestId]);

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

      // Clear local progress state once the job is done.
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

  // Auto-subscribe when panel opens
  useEffect(() => {
    subscribeToManifest(manifestId);
    return () => {
      unsubscribeFromManifest(manifestId);
    };
  }, [manifestId, subscribeToManifest, unsubscribeFromManifest]);

  // Navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex <= 0) {
      return;
    }
    const previousManifestId = allManifestIds[currentIndex - 1];
    if (!Number.isFinite(previousManifestId)) {
      return;
    }
    navigate(`/projects/${projectId}/groups/${groupId}/manifests/${previousManifestId}`, {
      state: { allManifestIds },
    });
  }, [allManifestIds, currentIndex, groupId, navigate, projectId]);

  const goToNext = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= allManifestIds.length - 1) {
      return;
    }
    const nextManifestId = allManifestIds[currentIndex + 1];
    if (!Number.isFinite(nextManifestId)) {
      return;
    }
    navigate(`/projects/${projectId}/groups/${groupId}/manifests/${nextManifestId}`, {
      state: { allManifestIds },
    });
  }, [allManifestIds, currentIndex, groupId, navigate, projectId]);

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

      latestDraftRef.current = data;
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
    [debounceTimer, manifestId, updateManifest],
  );

  const formatValidationSummary = useCallback(
    (result: ValidationResult) => {
      if (result.errorCount > 0) {
        const warningSuffix =
          result.warningCount > 0 ? ` • ${t('audit.validation.warnings', { count: result.warningCount })}` : '';
        return `${t('audit.validation.errors', { count: result.errorCount })}${warningSuffix}`;
      }
      if (result.warningCount > 0) {
        return t('audit.validation.warnings', { count: result.warningCount });
      }
      return t('audit.validation.passed');
    },
    [t],
  );

  const handleRunValidationClick = useCallback(async () => {
    if (!manifest) {
      return;
    }

    try {
      const result = await runValidation.mutateAsync({ manifestId: manifest.id });

      toast({
        title: t('audit.menu.runValidation'),
        description: formatValidationSummary(result),
        variant: result.errorCount > 0 ? 'destructive' : 'default',
        action: (
          <ToastAction altText={t('common.view')} onClick={() => setActiveTab('validation')}>
            {t('common.view')}
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('audit.menu.runValidation'),
        description: getApiErrorText(error, t),
      });
    }
  }, [formatValidationSummary, manifest, runValidation, setActiveTab, t]);

  const handleExplicitSave = useCallback(async () => {
    if (!manifest) {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }

    const draft = latestDraftRef.current;
    const desiredHumanVerified = Boolean(draft?.humanVerified ?? manifest.humanVerified);
    const shouldPromoteToVerified = desiredHumanVerified && !manifest.humanVerified;
    const extractedDataToSave = draft?.extractedData ?? manifest.extractedData;

    setExplicitSavePending(true);
    setSaveStatus('saving');

    try {
      const firstSave = await updateManifest.mutateAsync({
        manifestId,
        data: {
          extractedData: extractedDataToSave ?? undefined,
          humanVerified: shouldPromoteToVerified ? false : desiredHumanVerified,
        },
      });
      queryClient.setQueryData(['manifests', manifestId], firstSave);

      if (shouldPromoteToVerified) {
        const validation = await runValidation.mutateAsync({ manifestId: manifest.id });

        if (validation.errorCount > 0) {
          const confirmed = await confirm({
            title: t('audit.verify.confirmTitle'),
            message: t('audit.verify.confirmMessage', {
              errors: validation.errorCount,
              warnings: validation.warningCount,
            }),
            confirmText: t('audit.verify.confirmText'),
            cancelText: t('common.cancel'),
            destructive: true,
          });

          if (!confirmed) {
            setFormResetCounter((prev) => prev + 1);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            return;
          }
        }

        const verifiedSave = await updateManifest.mutateAsync({
          manifestId,
          data: { humanVerified: true },
        });
        queryClient.setQueryData(['manifests', manifestId], verifiedSave);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);

      toast({
        variant: 'destructive',
        title: t('audit.save.failed'),
        description: getApiErrorText(error, t),
      });
    } finally {
      setExplicitSavePending(false);
    }
  }, [confirm, debounceTimer, latestDraftRef, manifest, manifestId, queryClient, runValidation, t, updateManifest]);

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
          title: t('audit.reextract.queuedTitle'),
          description: targetFieldName,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('audit.reextract.failedTitle'),
          description: getApiErrorText(error, t),
        });
      }
    },
    [getReExtractTargetField, manifestId, normalizeHintPath, reExtractFieldWithPreview, t],
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

  const handleExtractManifest = useCallback(async () => {
    if (!manifest) return;

    const confirmed = await confirm({
      title: t('audit.extract.confirmTitle'),
      message: t('audit.extract.confirmMessage', { filename: manifest.originalFilename }),
      confirmText: t('audit.extract.confirmCta'),
      cancelText: t('common.cancel'),
      destructive: false,
    });
    if (!confirmed) return;

    try {
      const response = await manifestsApi.extractManifest(manifest.id);
      const now = new Date().toISOString();
      useJobsStore.getState().upsertJob({
        id: response.jobId,
        kind: 'extraction',
        manifestId: manifest.id,
        status: 'waiting',
        progress: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      });
      useUiStore.getState().setJobsPanelOpen(true);
      toast({
        title: t('audit.extract.startedTitle'),
        description: t('audit.extract.startedMessage'),
      });
    } catch (error) {
      console.error('Extract manifest failed:', error);
      toast({
        title: t('audit.extract.failedTitle'),
        description: getApiErrorText(error, t),
        variant: 'destructive',
      });
    }
  }, [confirm, manifest, t]);

  if (isLoading || !manifest) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
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
      ? t('audit.validation.errors', { count: manifest.validationResults.errorCount })
      : manifest.validationResults.warningCount > 0
        ? t('audit.validation.warnings', { count: manifest.validationResults.warningCount })
        : t('audit.validation.passed')
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
              { label: t('nav.projects'), to: '/projects' },
              { label: projectLabel, to: `/projects/${projectId}` },
              {
                label: t('manifests.breadcrumbWithGroup', { group: groupLabel }),
                to: `/projects/${projectId}/groups/${groupId}/manifests`,
              },
              { label: manifest.originalFilename },
            ]}
          />
          <h2 className="text-lg font-semibold text-foreground">{manifest.originalFilename}</h2>
          <p className="text-sm text-muted-foreground">{manifest.storagePath}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
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
              {saveStatus === 'saved'
                ? t('audit.save.saved')
                : saveStatus === 'error'
                  ? t('audit.save.failed')
                  : t('audit.save.saving')}
            </span>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevious}
              disabled={currentIndex <= 0}
              className="p-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('audit.nav.previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-fit px-2 text-sm text-muted-foreground tabular-nums">
              {displayIndex} / {allManifestIds.length}
            </span>
            <button
              onClick={goToNext}
              disabled={currentIndex < 0 || currentIndex >= allManifestIds.length - 1}
              className="p-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('audit.nav.next')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={explicitSavePending || updateManifest.isPending || runValidation.isPending}
            onClick={() => void handleExplicitSave()}
            title={t('common.save')}
          >
            <Save className="h-4 w-4" />
            {explicitSavePending ? t('common.saving') : t('common.save')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={runValidation.isPending || explicitSavePending}
            onClick={() => void handleRunValidationClick()}
            title={t('audit.menu.runValidation')}
          >
            <Play className="h-4 w-4" />
            {runValidation.isPending ? t('audit.menu.runningValidation') : t('audit.menu.runValidation')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={
              !manifest ||
              isLoading ||
              manifest.status === 'processing' ||
              jobProgress?.status === 'processing' ||
              jobProgress?.status === 'canceling'
            }
            onClick={() => void handleExtractManifest()}
            title={t('audit.extract.title')}
          >
            <Play className="h-4 w-4" />
            {t('audit.extract.title')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2"
            onClick={onClose}
            title={t('audit.nav.close')}
            aria-label={t('audit.nav.close')}
          >
            <X className="h-4 w-4" />
          </Button>

          <AuditPanelFunctionsMenu
            activeTab={activeTab}
            onTabChange={setActiveTab}
            validationLabel={validationLabel}
            validationStatus={validationStatus}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="relative flex flex-col lg:flex-row h-full overflow-hidden">
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
              resetCounter={formResetCounter}
            />
          ) : activeTab === 'extraction' ? (
            <div className="p-6 space-y-4">
              <div className="rounded-md border border-border p-4">
                <div className="text-sm font-medium text-foreground">{t('audit.extraction.extractorTitle')}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {currentExtractor?.name ?? manifest.textExtractorId ?? t('audit.extraction.notSelected')}
                </div>
                {currentExtractor && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t('audit.extraction.typeLabel')}: {currentExtractor.extractorType} •{' '}
                    {currentExtractor.isActive ? t('audit.extraction.active') : t('audit.extraction.inactive')}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="text-sm font-medium text-foreground">{t('audit.processing.title')}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t('audit.processing.textProcessed', {
                    date: manifest.ocrProcessedAt
                      ? new Date(manifest.ocrProcessedAt).toLocaleString()
                      : t('common.na'),
                  })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t('audit.processing.ocrQualityScore', {
                    score: manifest.ocrQualityScore ?? t('common.na'),
                  })}
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
                  <div className="text-sm font-medium text-foreground">{t('audit.ocr.summaryTitle')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('audit.ocr.summaryLine', {
                      date: manifest.ocrProcessedAt
                        ? new Date(manifest.ocrProcessedAt).toLocaleString()
                        : t('common.na'),
                      score: manifest.ocrQualityScore ?? t('common.na'),
                    })}
                  </div>
                </div>
                <button
                  onClick={() => setShowOcrPreviewModal(true)}
                  className="px-3 py-1 text-xs font-medium border border-border rounded hover:bg-muted"
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  {t('audit.ocr.openDetails')}
                </button>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm font-medium text-foreground mb-2">{t('audit.ocr.cachedTextTitle')}</div>
                {isOcrLoading && <p className="text-sm text-muted-foreground">{t('audit.ocr.loadingText')}</p>}
                {ocrError && <p className="text-sm text-destructive">{t('audit.ocr.failedCachedText')}</p>}
                {!isOcrLoading && !ocrError && !ocrData?.ocrResult && (
                  <p className="text-sm text-muted-foreground">
                    {t('audit.ocr.noCachedText')}
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
                <div className="text-sm font-medium text-foreground mb-2">{t('audit.ocr.diagnosticsTitle')}</div>
                <OcrViewer manifest={manifest} />
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="p-6">
              {historyFieldFilter ? (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    {t('audit.history.filteringByField')}{' '}
                    <span className="font-medium text-foreground">{historyFieldFilter}</span>
                  </div>
                  <button
                    onClick={() => setHistoryFieldFilter(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('audit.history.clearFilter')}
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
              {t('audit.history.dialogTitle')}{historyFieldFilter ? `: ${historyFieldFilter}` : ''}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('audit.history.dialogDescription')}
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

      <ModalDialog />
    </div>
  );
}
