import { useEffect, useId, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/client';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { Button } from '@/shared/components/ui/button';
import { useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas, useSchema, useSchemas } from '@/shared/hooks/use-schemas';
import { useAuthStore } from '@/shared/stores/auth';

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
  const baseId = useId();

  const { project, isLoading: projectLoading } = useProject(projectId);
  const { schemas, isLoading: projectSchemasLoading } = useProjectSchemas(projectId);
  const schemaId = schemas[0]?.id ?? 0;
  const { schema, isLoading: schemaLoading } = useSchema(schemaId);
  const schemaRecord = schema;
  const { updateSchema, isUpdating } = useSchemas();

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

  const isAbortError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    if (!('name' in error)) return false;
    return (error as { name?: unknown }).name === 'AbortError';
  };

  const streamPromptRulesMarkdown = async (payload: Record<string, unknown>, controller: AbortController) => {
    const token = useAuthStore.getState().token;
    const response = await fetch(`/api/schemas/${schemaId}/generate-prompt-rules/stream`, {
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
      ) : !schemaId || !schemaRecord ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Schema is not available yet. Run the first extraction to generate it.
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
                      setSaveError(getApiErrorMessage(error, 'Unable to save prompt rules. Please try again.'));
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
                            setGenerateError(getApiErrorMessage(error, 'Unable to generate rules. Please try again.'));
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
                          setGenerateError(getApiErrorMessage(error, 'Unable to regenerate rules. Please try again.'));
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
        </>
      )}
    </ProjectSettingsShell>
  );
}
