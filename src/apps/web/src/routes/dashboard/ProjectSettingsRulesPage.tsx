import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, getApiErrorText } from '@/api/client';
import type { CorrectionAnalysisResult, CorrectionSuggestion, OcrDomainHints } from '@/api/schemas';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { Button } from '@/shared/components/ui/button';
import { useProject } from '@/shared/hooks/use-projects';
import { useCorrectionAnalysis, useCorrectionSuggestions, useCorrectionSummary, useGenerateDomainHints, useProjectSchemas, useSchema, useSchemas } from '@/shared/hooks/use-schemas';
import { useAuthStore } from '@/shared/stores/auth';
import { useI18n } from '@/shared/providers/I18nProvider';
import { isSchemaReadyForRules } from '@/shared/utils/schema';

const DEFAULT_PROMPT_RULES_MARKDOWN = `## OCR Corrections

### Char Confusions (token-level)
| from | to | apply when |
|---|---|---|
| O | 0 | numeric-like tokens (ids, amounts, models) |
| l | 1 | numeric-like tokens |
| S | 5 | numeric-like tokens |

### Phrase Fixes (domain terms)
| from | to | note |
|---|---|---|
| <from> | <to> | <short note> |

## Extraction Rules
- Add schema-specific extraction rules here.

## Cross Verification
- If there are multiple sources in the OCR text, define how to reconcile conflicts.`;

export function ProjectSettingsRulesPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const navigate = useNavigate();
  const baseId = useId();
  const { t } = useI18n();

  const { project, isLoading: projectLoading } = useProject(projectId);
  const { schemas, isLoading: projectSchemasLoading } = useProjectSchemas(projectId);
  const schemaId = schemas[0]?.id ?? 0;
  const { schema, isLoading: schemaLoading } = useSchema(schemaId);
  const schemaRecord = schema;
  const { updateSchema, isUpdating } = useSchemas();
  const correctionAnalysis = useCorrectionAnalysis(schemaId);
  const { data: correctionSummary } = useCorrectionSummary(schema?.id);
  const { data: correctionSuggestions } = useCorrectionSuggestions(schema?.id);
  const schemaReady = isSchemaReadyForRules(schemaRecord);

  const [analysisResult, setAnalysisResult] = useState<CorrectionAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [correctionCandidate, setCorrectionCandidate] = useState<string | null>(null);
  const [correctionGenerateError, setCorrectionGenerateError] = useState<string | null>(null);
  const [isCorrectionGenerating, setIsCorrectionGenerating] = useState(false);
  const [correctionFeedback, setCorrectionFeedback] = useState('');
  const [showCorrectionDiff, setShowCorrectionDiff] = useState(false);
  const correctionAbortRef = useRef<AbortController | null>(null);

  const savedPromptRulesMarkdown = useMemo(() => {
    const raw = (schemaRecord?.validationSettings as Record<string, unknown> | null | undefined)
      ?.promptRulesMarkdown;
    return typeof raw === 'string' ? raw : '';
  }, [schemaRecord?.validationSettings]);

  const [draftPromptRulesMarkdown, setDraftPromptRulesMarkdown] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [candidateRulesMarkdown, setCandidateRulesMarkdown] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationAbortController, setGenerationAbortController] = useState<AbortController | null>(null);

  // Auto-approve settings
  const savedAutoApproveThreshold = useMemo(() => {
    const raw = (schemaRecord?.validationSettings as Record<string, unknown> | null | undefined)
      ?.autoApproveConfidenceThreshold;
    return typeof raw === 'number' ? raw : null;
  }, [schemaRecord?.validationSettings]);

  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(0.95);

  useEffect(() => {
    if (savedAutoApproveThreshold !== null) {
      setAutoApproveEnabled(true);
      setAutoApproveThreshold(savedAutoApproveThreshold);
    } else {
      setAutoApproveEnabled(false);
      setAutoApproveThreshold(0.95);
    }
  }, [savedAutoApproveThreshold]);

  // OCR Domain Hints
  const generateDomainHints = useGenerateDomainHints(schema?.id);
  const savedDomainHints = useMemo(() => {
    const raw = (schemaRecord?.validationSettings as Record<string, unknown> | null | undefined)
      ?.ocrDomainHints as OcrDomainHints | undefined;
    return raw ?? null;
  }, [schemaRecord?.validationSettings]);

  const [domainDocType, setDomainDocType] = useState('');
  const [domainLanguage, setDomainLanguage] = useState('');
  const [domainConfusions, setDomainConfusions] = useState<Array<{ from: string; to: string; context: string }>>([]);
  const [domainFieldHints, setDomainFieldHints] = useState<Array<{ field: string; hint: string }>>([]);
  const [domainCustomInstructions, setDomainCustomInstructions] = useState('');
  const [domainHintsSaveError, setDomainHintsSaveError] = useState<string | null>(null);
  const [isDomainHintsSaving, setIsDomainHintsSaving] = useState(false);
  const [isDomainHintsGenerating, setIsDomainHintsGenerating] = useState(false);

  useEffect(() => {
    if (savedDomainHints) {
      setDomainDocType(savedDomainHints.documentType ?? '');
      setDomainLanguage(savedDomainHints.language ?? '');
      setDomainConfusions(
        (savedDomainHints.knownConfusions ?? []).map((c) => ({ from: c.from, to: c.to, context: c.context ?? '' })),
      );
      setDomainFieldHints(savedDomainHints.fieldHints ?? []);
      setDomainCustomInstructions(savedDomainHints.customInstructions ?? '');
    } else {
      setDomainDocType('');
      setDomainLanguage('');
      setDomainConfusions([]);
      setDomainFieldHints([]);
      setDomainCustomInstructions('');
    }
  }, [savedDomainHints]);

  const handleSaveAutoApproveThreshold = async (value: number | null) => {
    try {
      const nextValidationSettings = {
        ...(schemaRecord?.validationSettings ?? {}),
        autoApproveConfidenceThreshold: value,
      };
      await updateSchema({ id: schemaId, data: { validationSettings: nextValidationSettings } });
    } catch {
      // ignore — updateSchema handles errors via react-query
    }
  };


  const isAbortError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    if (!('name' in error)) return false;
    return (error as { name?: unknown }).name === 'AbortError';
  };

  const streamPromptRulesMarkdown = async (payload: Record<string, unknown>, controller: AbortController) => {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/schemas/${schemaId}/generate-prompt-rules/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Missing response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';

    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');

        if (!line) continue;
        const msg = JSON.parse(line) as { type: string; content?: string; message?: string };
        if (msg.type === 'delta' && typeof msg.content === 'string') {
          assembled += msg.content;
          setCandidateRulesMarkdown(assembled);
        } else if (msg.type === 'error') {
          throw new Error(msg.message ?? 'Unknown error');
        }
      }
    }

    return assembled;
  };

  const streamCorrectionRules = async (payload: Record<string, unknown>, controller: AbortController) => {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/schemas/${schemaId}/generate-prompt-rules-from-corrections/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Missing response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';

    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');

        if (!line) continue;
        const msg = JSON.parse(line) as { type: string; content?: string; message?: string; analysis?: CorrectionAnalysisResult };
        if (msg.type === 'start' && msg.analysis) {
          setAnalysisResult(msg.analysis);
        } else if (msg.type === 'delta' && typeof msg.content === 'string') {
          assembled += msg.content;
          setCorrectionCandidate(assembled);
        } else if (msg.type === 'error') {
          throw new Error(msg.message ?? 'Unknown error');
        }
      }
    }

    return assembled;
  };

  useEffect(() => {
    if (!schemaId || !schemaRecord) return;
    const nextDraft = savedPromptRulesMarkdown.trim()
      ? savedPromptRulesMarkdown
      : DEFAULT_PROMPT_RULES_MARKDOWN;
    setDraftPromptRulesMarkdown(nextDraft);
    setSaveError(null);
    setGenerateError(null);
    setCandidateRulesMarkdown(null);
    setRejectReason('');
    setIsGenerating(false);
    setGenerationAbortController(null);
  }, [schemaId, schemaRecord, savedPromptRulesMarkdown]);

  const isLoading = projectLoading || projectSchemasLoading || schemaLoading;

  return (
    <ProjectSettingsShell projectId={projectId} schemaIdOverride={schemaId || null} activeTab="rules">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      ) : !schemaId || !schemaRecord || !schemaReady ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-foreground">{t('rules.settings.noSchemaTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('rules.settings.noSchemaMessage')}</p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/projects/${projectId}/settings/schema`)}
            >
              {t('rules.settings.goToSchemaCta')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{schemaRecord.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{`Project ID: ${schemaRecord.projectId}`}</p>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Prompt Rules</h2>
                <p className="text-sm text-muted-foreground">
                  Configure a single Markdown block that guides extraction (OCR corrections, extraction rules, and cross verification).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraftPromptRulesMarkdown(DEFAULT_PROMPT_RULES_MARKDOWN)}
                  disabled={isSaving || isUpdating}
                >
                  Use Template
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraftPromptRulesMarkdown(savedPromptRulesMarkdown || DEFAULT_PROMPT_RULES_MARKDOWN)}
                  disabled={isSaving || isUpdating}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    setSaveError(null);
                    setIsSaving(true);
                    try {
                      const trimmed = draftPromptRulesMarkdown.trim();
                      const nextValidationSettings = {
                        ...(schemaRecord.validationSettings ?? {}),
                        promptRulesMarkdown: trimmed ? trimmed : null,
                      };
                      await updateSchema({
                        id: schemaId,
                        data: { validationSettings: nextValidationSettings },
                      });
                    } catch (error) {
      setSaveError(getApiErrorText(error, t));
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving || isUpdating}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            {saveError && <p className="mb-3 text-sm text-destructive">{saveError}</p>}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Rules (Markdown)</h3>
                  <span className="text-xs text-muted-foreground">Stored on schema</span>
                </div>
                <textarea
                  value={draftPromptRulesMarkdown}
                  onChange={(event) => setDraftPromptRulesMarkdown(event.target.value)}
                  className="min-h-[420px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-ring focus:outline-none focus:ring-ring"
                  placeholder="Enter prompt rules as Markdown..."
                />
                <p className="text-xs text-muted-foreground">
                  Saved to <code>validationSettings.promptRulesMarkdown</code> and appended to the LLM system prompt during extraction.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
                  <span className="text-xs text-muted-foreground">Generate a draft, then accept/reject</span>
                </div>

                <div className="grid gap-2">
                  <label htmlFor={`${baseId}-assistant-prompt`} className="text-xs font-medium text-muted-foreground">Your request</label>
                  <textarea
                    id={`${baseId}-assistant-prompt`}
                    value={assistantPrompt}
                    onChange={(event) => setAssistantPrompt(event.target.value)}
                    className="min-h-[90px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
                    placeholder="Describe what rules to add/change (e.g., add OCR correction mappings for numeric tokens; add cross verification steps for two sources in the OCR text)."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={async () => {
                        setGenerateError(null);
                        setCandidateRulesMarkdown(null);
                        setRejectReason('');

                        if (!project?.llmModelId) {
                          setGenerateError('Project LLM model is not configured.');
                          return;
                        }
                        if (!assistantPrompt.trim()) {
                          setGenerateError('Please enter a request for the AI assistant.');
                          return;
                        }

                        generationAbortController?.abort();
                        const controller = new AbortController();
                        setGenerationAbortController(controller);
                        setIsGenerating(true);

                        try {
                          setCandidateRulesMarkdown('');
                          const assembled = await streamPromptRulesMarkdown(
                            {
                              modelId: project.llmModelId,
                              prompt: assistantPrompt.trim(),
                              currentRulesMarkdown: draftPromptRulesMarkdown,
                            },
                            controller,
                          );
                          setCandidateRulesMarkdown(assembled.trim() ? assembled : '');
                        } catch (error) {
                          if (isAbortError(error)) {
                            setGenerateError('Generation canceled.');
                          } else {
        setGenerateError(getApiErrorText(error, t));
                          }
                        } finally {
                          setIsGenerating(false);
                          setGenerationAbortController(null);
                        }
                      }}
                      disabled={isGenerating || !schemaId}
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => generationAbortController?.abort()}
                      disabled={!isGenerating}
                    >
                      Stop
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (!candidateRulesMarkdown) return;
                        setDraftPromptRulesMarkdown(candidateRulesMarkdown);
                        setCandidateRulesMarkdown(null);
                        setRejectReason('');
                        setGenerateError(null);
                      }}
                      disabled={!candidateRulesMarkdown || isGenerating}
                    >
                      Accept
                    </Button>
                  </div>
                </div>

                {generateError && <p className="text-sm text-destructive">{generateError}</p>}

                <div className="grid gap-2">
                  <label htmlFor={`${baseId}-candidate-rules`} className="text-xs font-medium text-muted-foreground">Candidate rules (generated)</label>
                  <textarea
                    id={`${baseId}-candidate-rules`}
                    value={candidateRulesMarkdown ?? ''}
                    readOnly
                    className="min-h-[220px] w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-mono"
                    placeholder="Generated candidate will appear here..."
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor={`${baseId}-reject-reason`} className="text-xs font-medium text-muted-foreground">Reject reason (optional)</label>
                  <textarea
                    id={`${baseId}-reject-reason`}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    className="min-h-[70px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
                    placeholder="Why is the candidate not acceptable? What should change?"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      setGenerateError(null);
                      if (!project?.llmModelId) {
                        setGenerateError('Project LLM model is not configured.');
                        return;
                      }
                      if (!assistantPrompt.trim()) {
                        setGenerateError('Please enter a request for the AI assistant.');
                        return;
                      }
                      if (!candidateRulesMarkdown) {
                        setGenerateError('No candidate to regenerate. Click Generate first.');
                        return;
                      }

                      generationAbortController?.abort();
                      const controller = new AbortController();
                      setGenerationAbortController(controller);
                      setIsGenerating(true);

                      try {
                        setCandidateRulesMarkdown('');
                        const assembled = await streamPromptRulesMarkdown(
                          {
                            modelId: project.llmModelId,
                            prompt: assistantPrompt.trim(),
                            currentRulesMarkdown: draftPromptRulesMarkdown,
                            previousCandidateMarkdown: candidateRulesMarkdown,
                            feedback: rejectReason.trim() ? rejectReason.trim() : undefined,
                          },
                          controller,
                        );
                        setCandidateRulesMarkdown(assembled.trim() ? assembled : '');
                      } catch (error) {
                        if (isAbortError(error)) {
                          setGenerateError('Generation canceled.');
                        } else {
      setGenerateError(getApiErrorText(error, t));
                        }
                      } finally {
                        setIsGenerating(false);
                        setGenerationAbortController(null);
                      }
                    }}
                    disabled={isGenerating || !candidateRulesMarkdown}
                  >
                    {isGenerating ? 'Regenerating...' : 'Reject & Regenerate'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Approve Settings */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('settings.rules.autoApprove.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('settings.rules.autoApprove.description')}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoApproveEnabled}
                    onChange={(e) => {
                      setAutoApproveEnabled(e.target.checked);
                      if (!e.target.checked) {
                        handleSaveAutoApproveThreshold(null);
                      }
                    }}
                    className="rounded border-border"
                  />
                  {t('settings.rules.autoApprove.enabled')}
                </label>
              </div>
              {autoApproveEnabled && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-muted-foreground">{t('settings.rules.autoApprove.threshold')}</label>
                  <input
                    type="range"
                    min="0.80"
                    max="1.00"
                    step="0.01"
                    value={autoApproveThreshold}
                    onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
                    className="w-40"
                  />
                  <span className="text-sm font-mono tabular-nums w-12">{autoApproveThreshold.toFixed(2)}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveAutoApproveThreshold(autoApproveThreshold)}
                    disabled={isUpdating}
                  >
                    Save
                  </Button>
                </div>
              )}
              {!autoApproveEnabled && (
                <p className="text-xs text-muted-foreground">{t('settings.rules.autoApprove.disabled')}</p>
              )}
            </div>
          </div>

          {/* OCR Domain Hints */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('settings.rules.domainHints.title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('settings.rules.domainHints.description')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      setIsDomainHintsGenerating(true);
                      setDomainHintsSaveError(null);
                      try {
                        const hints = await generateDomainHints.mutateAsync(undefined);
                        if (hints.knownConfusions?.length) {
                          setDomainConfusions(hints.knownConfusions.map((c) => ({ from: c.from, to: c.to, context: c.context ?? '' })));
                        }
                        if (hints.fieldHints?.length) {
                          setDomainFieldHints(hints.fieldHints);
                        }
                      } catch (error) {
                        setDomainHintsSaveError(getApiErrorText(error, t));
                      } finally {
                        setIsDomainHintsGenerating(false);
                      }
                    }}
                    disabled={isDomainHintsGenerating || isDomainHintsSaving}
                  >
                    {isDomainHintsGenerating ? t('settings.rules.domainHints.generating') : t('settings.rules.domainHints.generateFromCorrections')}
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      setDomainHintsSaveError(null);
                      setIsDomainHintsSaving(true);
                      try {
                        const hints: OcrDomainHints = {};
                        if (domainDocType.trim()) hints.documentType = domainDocType.trim();
                        if (domainLanguage.trim()) hints.language = domainLanguage.trim();
                        if (domainConfusions.length > 0) {
                          hints.knownConfusions = domainConfusions
                            .filter((c) => c.from.trim() && c.to.trim())
                            .map((c) => ({ from: c.from.trim(), to: c.to.trim(), context: c.context.trim() || undefined }));
                        }
                        if (domainFieldHints.length > 0) {
                          hints.fieldHints = domainFieldHints
                            .filter((fh) => fh.field.trim() && fh.hint.trim());
                        }
                        if (domainCustomInstructions.trim()) hints.customInstructions = domainCustomInstructions.trim();

                        const hasContent = Object.keys(hints).length > 0;
                        const nextValidationSettings = {
                          ...(schemaRecord?.validationSettings ?? {}),
                          ocrDomainHints: hasContent ? hints : null,
                        };
                        await updateSchema({ id: schemaId, data: { validationSettings: nextValidationSettings } });
                      } catch (error) {
                        setDomainHintsSaveError(getApiErrorText(error, t));
                      } finally {
                        setIsDomainHintsSaving(false);
                      }
                    }}
                    disabled={isDomainHintsSaving || isUpdating}
                  >
                    {isDomainHintsSaving ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </div>

              {domainHintsSaveError && <p className="text-sm text-destructive">{domainHintsSaveError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t('settings.rules.domainHints.documentType')}</label>
                  <input
                    type="text"
                    value={domainDocType}
                    onChange={(e) => setDomainDocType(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
                    placeholder={t('settings.rules.domainHints.documentTypePlaceholder')}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t('settings.rules.domainHints.language')}</label>
                  <input
                    type="text"
                    value={domainLanguage}
                    onChange={(e) => setDomainLanguage(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
                    placeholder={t('settings.rules.domainHints.languagePlaceholder')}
                  />
                </div>
              </div>

              {/* Known Confusions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">{t('settings.rules.domainHints.knownConfusions')}</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDomainConfusions([...domainConfusions, { from: '', to: '', context: '' }])}
                  >
                    + {t('common.add')}
                  </Button>
                </div>
                {domainConfusions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                      <span>From</span>
                      <span>To</span>
                      <span>{t('settings.rules.domainHints.confusionContext')}</span>
                      <span className="w-8" />
                    </div>
                    {domainConfusions.map((c, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <input
                          type="text"
                          value={c.from}
                          onChange={(e) => {
                            const next = [...domainConfusions];
                            next[i] = { ...next[i], from: e.target.value };
                            setDomainConfusions(next);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono focus:border-ring focus:outline-none"
                          placeholder="理弧焊"
                        />
                        <input
                          type="text"
                          value={c.to}
                          onChange={(e) => {
                            const next = [...domainConfusions];
                            next[i] = { ...next[i], to: e.target.value };
                            setDomainConfusions(next);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono focus:border-ring focus:outline-none"
                          placeholder="埋弧焊"
                        />
                        <input
                          type="text"
                          value={c.context}
                          onChange={(e) => {
                            const next = [...domainConfusions];
                            next[i] = { ...next[i], context: e.target.value };
                            setDomainConfusions(next);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-ring focus:outline-none"
                          placeholder={t('settings.rules.domainHints.confusionContextPlaceholder')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDomainConfusions(domainConfusions.filter((_, j) => j !== i))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Field Hints */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">{t('settings.rules.domainHints.fieldHints')}</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDomainFieldHints([...domainFieldHints, { field: '', hint: '' }])}
                  >
                    + {t('common.add')}
                  </Button>
                </div>
                {domainFieldHints.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_2fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                      <span>{t('settings.rules.domainHints.fieldPath')}</span>
                      <span>{t('settings.rules.domainHints.hint')}</span>
                      <span className="w-8" />
                    </div>
                    {domainFieldHints.map((fh, i) => (
                      <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                        <input
                          type="text"
                          value={fh.field}
                          onChange={(e) => {
                            const next = [...domainFieldHints];
                            next[i] = { ...next[i], field: e.target.value };
                            setDomainFieldHints(next);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono focus:border-ring focus:outline-none"
                          placeholder="items.*.model"
                        />
                        <input
                          type="text"
                          value={fh.hint}
                          onChange={(e) => {
                            const next = [...domainFieldHints];
                            next[i] = { ...next[i], hint: e.target.value };
                            setDomainFieldHints(next);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-ring focus:outline-none"
                          placeholder={t('settings.rules.domainHints.hintPlaceholder')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDomainFieldHints(domainFieldHints.filter((_, j) => j !== i))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Instructions */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('settings.rules.domainHints.customInstructions')}</label>
                <textarea
                  value={domainCustomInstructions}
                  onChange={(e) => setDomainCustomInstructions(e.target.value)}
                  className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
                  placeholder={t('settings.rules.domainHints.customInstructionsPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Correction Analysis Panel */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('settings.rules.correctionAnalysis.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.rules.correctionAnalysis.description')}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  setAnalysisError(null);
                  try {
                    const result = await correctionAnalysis.mutateAsync({});
                    setAnalysisResult(result);
                  } catch (error) {
                    setAnalysisError(getApiErrorText(error, t));
                  }
                }}
                disabled={correctionAnalysis.isPending}
              >
                {correctionAnalysis.isPending
                  ? t('settings.rules.correctionAnalysis.analyzing')
                  : t('settings.rules.correctionAnalysis.analyze')}
              </Button>
            </div>

            {correctionSummary && correctionSummary.totalCorrections > 10 && correctionSummary.hasNewPatterns && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {t('settings.rules.correctionAnalysis.newPatternsHint', { count: correctionSummary.totalCorrections })}
              </div>
            )}

            {analysisError && <p className="mb-3 text-sm text-destructive">{analysisError}</p>}

            {analysisResult && (
              <div className="space-y-4">
                {/* Summary */}
                {analysisResult.totalLogs === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('settings.rules.correctionAnalysis.empty')}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="rounded-md bg-muted px-2.5 py-1">
                        {t('settings.rules.correctionAnalysis.totalLogs', { count: analysisResult.totalLogs })}
                      </span>
                      <span className="rounded-md bg-muted px-2.5 py-1">
                        {t('settings.rules.correctionAnalysis.totalDiffs', { count: analysisResult.totalDiffs })}
                      </span>
                      <span className="rounded-md bg-muted px-2.5 py-1">
                        {t('settings.rules.correctionAnalysis.manifests', { count: analysisResult.summary.manifestsWithCorrections })}
                      </span>
                    </div>

                    {/* Top Corrected Fields */}
                    {analysisResult.topCorrectedFields.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">{t('settings.rules.correctionAnalysis.topFields')}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">{t('settings.rules.correctionAnalysis.fieldPath')}</th>
                                <th className="text-right py-1.5 pr-4 text-muted-foreground font-medium">{t('settings.rules.correctionAnalysis.corrections')}</th>
                                <th className="text-left py-1.5 text-muted-foreground font-medium">{t('settings.rules.correctionAnalysis.examples')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResult.topCorrectedFields.slice(0, 10).map((field) => (
                                <tr key={field.path} className="border-b border-border/50">
                                  <td className="py-1.5 pr-4 font-mono text-xs">{field.path}</td>
                                  <td className="py-1.5 pr-4 text-right">{field.count}</td>
                                  <td className="py-1.5 text-xs text-muted-foreground">
                                    {field.examples.slice(0, 3).map((ex, i) => (
                                      <span key={i}>
                                        {i > 0 && '; '}
                                        <span className="text-destructive">{formatAnalysisValue(ex.before)}</span>
                                        {' → '}
                                        <span className="text-green-600 dark:text-green-400">{formatAnalysisValue(ex.after)}</span>
                                        {ex.count > 1 && <span className="text-muted-foreground"> (×{ex.count})</span>}
                                      </span>
                                    ))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* OCR Confusions */}
                    {analysisResult.ocrConfusions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">{t('settings.rules.correctionAnalysis.ocrConfusions')}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">From</th>
                                <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">To</th>
                                <th className="text-right py-1.5 pr-4 text-muted-foreground font-medium">{t('settings.rules.correctionAnalysis.occurrences')}</th>
                                <th className="text-left py-1.5 text-muted-foreground font-medium">{t('settings.rules.correctionAnalysis.context')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResult.ocrConfusions.slice(0, 10).map((c) => (
                                <tr key={`${c.from}-${c.to}`} className="border-b border-border/50">
                                  <td className="py-1.5 pr-4 font-mono">{c.from}</td>
                                  <td className="py-1.5 pr-4 font-mono">{c.to}</td>
                                  <td className="py-1.5 pr-4 text-right">{c.count}</td>
                                  <td className="py-1.5 text-xs text-muted-foreground">{c.contexts.slice(0, 3).join(', ')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Generate from corrections */}
                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!project?.llmModelId) {
                              setCorrectionGenerateError('Project LLM model is not configured.');
                              return;
                            }
                            setCorrectionGenerateError(null);
                            setCorrectionCandidate('');
                            setCorrectionFeedback('');
                            setShowCorrectionDiff(false);

                            correctionAbortRef.current?.abort();
                            const controller = new AbortController();
                            correctionAbortRef.current = controller;
                            setIsCorrectionGenerating(true);

                            try {
                              await streamCorrectionRules(
                                {
                                  modelId: project.llmModelId,
                                  feedback: correctionFeedback.trim() || undefined,
                                },
                                controller,
                              );
                            } catch (error) {
                              if (!isAbortError(error)) {
                                setCorrectionGenerateError(getApiErrorText(error, t));
                              }
                            } finally {
                              setIsCorrectionGenerating(false);
                              correctionAbortRef.current = null;
                            }
                          }}
                          disabled={isCorrectionGenerating}
                        >
                          {isCorrectionGenerating
                            ? t('settings.rules.correctionAnalysis.generating')
                            : t('settings.rules.correctionAnalysis.generate')}
                        </Button>

                        {isCorrectionGenerating && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => correctionAbortRef.current?.abort()}
                          >
                            Stop
                          </Button>
                        )}

                        {correctionCandidate && !isCorrectionGenerating && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              if (correctionCandidate) {
                                setDraftPromptRulesMarkdown(correctionCandidate);
                                setCorrectionCandidate(null);
                                setCorrectionFeedback('');
                              }
                            }}
                          >
                            {t('settings.rules.correctionAnalysis.accept')}
                          </Button>
                        )}
                      </div>

                      {correctionGenerateError && <p className="text-sm text-destructive">{correctionGenerateError}</p>}

                      {correctionCandidate !== null && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {t('settings.rules.correctionAnalysis.suggestion')}
                            </h4>
                            {correctionCandidate && !isCorrectionGenerating && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCorrectionDiff(!showCorrectionDiff)}
                              >
                                {showCorrectionDiff
                                  ? t('settings.rules.correctionAnalysis.showRaw')
                                  : t('settings.rules.correctionAnalysis.showDiff')}
                              </Button>
                            )}
                          </div>
                          {showCorrectionDiff && correctionCandidate && !isCorrectionGenerating ? (
                            <RulesDiffView current={draftPromptRulesMarkdown} suggested={correctionCandidate} />
                          ) : (
                            <textarea
                              value={correctionCandidate}
                              readOnly
                              className="min-h-[200px] w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-mono"
                              placeholder={t('settings.rules.correctionAnalysis.candidatePlaceholder')}
                            />
                          )}
                        </div>
                      )}

                      {correctionCandidate && !isCorrectionGenerating && (
                        <div className="space-y-2">
                          <textarea
                            value={correctionFeedback}
                            onChange={(e) => setCorrectionFeedback(e.target.value)}
                            className="min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring"
                            placeholder={t('settings.rules.correctionAnalysis.feedbackPlaceholder')}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={async () => {
                              if (!project?.llmModelId) {
                                setCorrectionGenerateError('Project LLM model is not configured.');
                                return;
                              }
                              setCorrectionGenerateError(null);
                              setCorrectionCandidate('');

                              correctionAbortRef.current?.abort();
                              const controller = new AbortController();
                              correctionAbortRef.current = controller;
                              setIsCorrectionGenerating(true);

                              try {
                                await streamCorrectionRules(
                                  {
                                    modelId: project.llmModelId,
                                    feedback: correctionFeedback.trim() || undefined,
                                  },
                                  controller,
                                );
                              } catch (error) {
                                if (!isAbortError(error)) {
                                  setCorrectionGenerateError(getApiErrorText(error, t));
                                }
                              } finally {
                                setIsCorrectionGenerating(false);
                                correctionAbortRef.current = null;
                              }
                            }}
                            disabled={isCorrectionGenerating}
                          >
                            {t('settings.rules.correctionAnalysis.reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Correction Suggestions */}
          {correctionSuggestions && correctionSuggestions.length > 0 && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('settings.rules.suggestions.title')}
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {correctionSuggestions.length}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{t('settings.rules.suggestions.description')}</p>
              </div>
              <div className="space-y-3">
                {correctionSuggestions.map((suggestion: CorrectionSuggestion, idx: number) => (
                  <div key={idx} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">{suggestion.fieldPath}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('settings.rules.suggestions.corrections', { count: suggestion.correctionCount })}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {suggestion.patterns.slice(0, 3).map((pattern, pidx) => (
                        <div key={pidx} className="text-xs text-muted-foreground">
                          <span className="line-through text-red-500/70">{pattern.before}</span>
                          {' → '}
                          <span className="text-green-600 dark:text-green-400">{pattern.after}</span>
                          {pattern.count > 1 && <span className="ml-1 text-muted-foreground">(x{pattern.count})</span>}
                        </div>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs italic text-muted-foreground">{suggestion.suggestedRule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ProjectSettingsShell>
  );
}

function formatAnalysisValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'string') return `"${value}"`;
  return JSON.stringify(value);
}

// --- Diff View ---

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
  oldLineNo?: number;
  newLineNo?: number;
}

function RulesDiffView({ current, suggested }: { current: string; suggested: string }) {
  const diff = useMemo(() => computeLineDiff(current, suggested), [current, suggested]);

  return (
    <div className="rounded-md border border-border overflow-auto max-h-[400px] text-xs font-mono">
      <table className="w-full border-collapse">
        <tbody>
          {diff.map((line, i) => (
            <tr
              key={i}
              className={
                line.type === 'added'
                  ? 'bg-green-50 dark:bg-green-950/30'
                  : line.type === 'removed'
                    ? 'bg-red-50 dark:bg-red-950/30'
                    : ''
              }
            >
              <td className="px-1.5 py-0.5 text-right text-muted-foreground/60 select-none w-8 border-r border-border">
                {line.type !== 'added' ? line.oldLineNo : ''}
              </td>
              <td className="px-1.5 py-0.5 text-right text-muted-foreground/60 select-none w-8 border-r border-border">
                {line.type !== 'removed' ? line.newLineNo : ''}
              </td>
              <td className="px-1 py-0.5 select-none w-4 text-center text-muted-foreground">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </td>
              <td className="px-1.5 py-0.5 whitespace-pre-wrap break-all">{line.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function computeLineDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const m = aLines.length;
  const n = bLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        aLines[i - 1] === bLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const stack: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      stack.push({ type: 'same', text: aLines[i - 1], oldLineNo: i, newLineNo: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: bLines[j - 1], newLineNo: j });
      j--;
    } else {
      stack.push({ type: 'removed', text: aLines[i - 1], oldLineNo: i });
      i--;
    }
  }

  return stack.reverse();
}
