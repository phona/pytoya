import { useState, useEffect, useMemo } from 'react';
import {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  TestValidationScriptResponseDto,
  ValidationScriptConsoleEntry,
  ValidationScript,
  ValidationSeverity,
} from '@/api/validation';
import { useProject, useProjects } from '@/shared/hooks/use-projects';
import { useValidateScriptSyntax, useGenerateValidationScript, useTestValidationScript } from '@/shared/hooks/use-validation-scripts';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import { getApiErrorText } from '@/api/client';
import { useI18n } from '@/shared/providers/I18nProvider';
import { ValidationResultsPanel } from '@/shared/components/ValidationResultsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

interface ValidationScriptFormProps {
  script?: ValidationScript;
  fixedProjectId?: number;
  showProjectField?: boolean;
  allowDraft?: boolean;
  draftProjectId?: string;
  onSubmit: (data: CreateValidationScriptDto | UpdateValidationScriptDto) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  isLoading?: boolean;
}

const DEFAULT_SCRIPT = `function validate(extractedData) {
  const issues = [];

  // Add your validation logic here
  // Example: Check if a field is missing
  // if (!extractedData.invoice?.total_amount) {
  //   issues.push({
  //     field: 'invoice.total_amount',
  //     message: 'Total amount is required',
  //     severity: 'error',
  //   });
  // }

  return issues;
}`;

export function ValidationScriptForm({
  script,
  fixedProjectId,
  showProjectField = true,
  allowDraft = false,
  draftProjectId = 'draft',
  onSubmit,
  onCancel,
  onDirtyChange,
  isLoading,
}: ValidationScriptFormProps) {
  const { t } = useI18n();
  const { confirm, alert, ModalDialog } = useModalDialog();
  const { projects } = useProjects();
  const validateSyntax = useValidateScriptSyntax();
  const generateScript = useGenerateValidationScript();
  const testValidationScript = useTestValidationScript();

  const [name, setName] = useState(script?.name ?? '');
  const [description, setDescription] = useState(script?.description ?? '');
  const [projectId, setProjectId] = useState(script?.projectId?.toString() ?? '');
  const [scriptCode, setScriptCode] = useState(script?.script ?? DEFAULT_SCRIPT);
  const [severity, setSeverity] = useState<ValidationSeverity>(
    script?.severity ?? ('warning' as ValidationSeverity),
  );
  const [enabled, setEnabled] = useState(script?.enabled ?? true);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isCheckingSyntax, setIsCheckingSyntax] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testInputJson, setTestInputJson] = useState<string>('{\n  "invoice": {},\n  "items": []\n}\n');
  const [testInputError, setTestInputError] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<TestValidationScriptResponseDto | null>(null);
  const fixedProjectIdValue = fixedProjectId ? fixedProjectId.toString() : '';
  const isEditing = Boolean(script && script.id > 0);
  const fixedProject = fixedProjectId
    ? projects.find((project) => project.id === fixedProjectId)
    : undefined;

  const effectiveProjectIdForGeneration = useMemo(() => {
    if (fixedProjectId) {
      return fixedProjectId;
    }

    const parsed = Number(projectId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [fixedProjectId, projectId]);

  const projectForGeneration = useMemo(() => {
    if (!effectiveProjectIdForGeneration) {
      return undefined;
    }
    return projects.find((project) => project.id === effectiveProjectIdForGeneration);
  }, [effectiveProjectIdForGeneration, projects]);

  const { project: projectDetailsForGeneration } = useProject(effectiveProjectIdForGeneration ?? 0);
  const resolvedProjectForGeneration = projectDetailsForGeneration ?? projectForGeneration;

  const { schemas: projectSchemas } = useProjectSchemas(effectiveProjectIdForGeneration ?? 0);

  const schemaForGeneration = useMemo(() => {
    if (!projectSchemas.length) {
      return undefined;
    }

    const desiredId = resolvedProjectForGeneration?.defaultSchemaId ?? null;
    if (desiredId) {
      return projectSchemas.find((schema) => schema.id === desiredId) ?? projectSchemas[0];
    }

    return projectSchemas[0];
  }, [projectSchemas, resolvedProjectForGeneration?.defaultSchemaId]);

  const initialProjectId = fixedProjectIdValue
    ? fixedProjectIdValue
    : script?.projectId?.toString() ?? (showProjectField ? '' : allowDraft ? draftProjectId : '');

  const isDirty = useMemo(() => {
    return (
      name !== (script?.name ?? '') ||
      description !== (script?.description ?? '') ||
      projectId !== initialProjectId ||
      scriptCode !== (script?.script ?? DEFAULT_SCRIPT) ||
      severity !== (script?.severity ?? ('warning' as ValidationSeverity)) ||
      enabled !== (script?.enabled ?? true)
    );
  }, [description, enabled, initialProjectId, name, projectId, script, scriptCode, severity]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (script?.projectId) {
      setProjectId(script.projectId.toString());
    }
  }, [script?.projectId]);

  useEffect(() => {
    if (fixedProjectIdValue && projectId !== fixedProjectIdValue) {
      setProjectId(fixedProjectIdValue);
    }
  }, [fixedProjectIdValue, projectId]);

  useEffect(() => {
    if (!showProjectField && allowDraft && !fixedProjectIdValue) {
      setProjectId(draftProjectId);
    }
  }, [allowDraft, draftProjectId, fixedProjectIdValue, showProjectField]);

  const structuredForGeneration = useMemo(() => {
    if (!schemaForGeneration) {
      return null;
    }

    return {
      project: resolvedProjectForGeneration
        ? { id: resolvedProjectForGeneration.id, name: resolvedProjectForGeneration.name }
        : undefined,
      schema: { id: schemaForGeneration.id, name: schemaForGeneration.name },
      jsonSchema: schemaForGeneration.jsonSchema,
      requiredFields: schemaForGeneration.requiredFields,
      validationSettings: schemaForGeneration.validationSettings ?? undefined,
    } satisfies Record<string, unknown>;
  }, [resolvedProjectForGeneration, schemaForGeneration]);

  const handleScriptChange = (value: string) => {
    setScriptCode(value);
    setSyntaxError(null);
  };

  const handleGenerate = async () => {
    const llmModelId = resolvedProjectForGeneration?.llmModelId ?? null;
    if (!llmModelId) {
      void alert({ title: 'Generate script', message: 'No LLM model is configured for this project.' });
      return;
    }

    if (!promptText.trim()) {
      void alert({ title: 'Generate script', message: 'Please enter a prompt.' });
      return;
    }

    if (!structuredForGeneration) {
      void alert({
        title: 'Generate script',
        message: 'No project schema found. Please create a schema first, then try again.',
      });
      return;
    }

    const hasExisting =
      name.trim() || description.trim() || scriptCode.trim() !== DEFAULT_SCRIPT.trim();

    if (hasExisting) {
      const confirmed = await confirm({
        title: 'Replace current script?',
        message: 'Replace the current script with the generated result?',
        confirmText: 'Replace',
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }

    setIsGenerating(true);
    try {
      const result = await generateScript.mutateAsync({
        llmModelId,
        prompt: promptText.trim(),
        structured: structuredForGeneration,
      });
      setName(result.name);
      setDescription(result.description ?? '');
      setSeverity(result.severity as ValidationSeverity);
      setScriptCode(result.script);
      setSyntaxError(null);
    } catch (error) {
      void alert({
        title: 'Generate script failed',
        message: getApiErrorText(error, t),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckSyntax = async () => {
    setIsCheckingSyntax(true);
    try {
      const result = await validateSyntax.mutateAsync({ script: scriptCode });
      if (result.valid) {
        setSyntaxError(null);
        void alert({ title: 'Syntax check', message: 'Syntax is valid!' });
      } else {
        setSyntaxError(result.error ?? 'Unknown syntax error');
      }
    } catch (error) {
      setSyntaxError(getApiErrorText(error, t));
    } finally {
      setIsCheckingSyntax(false);
    }
  };

  const handleFormatTestJson = () => {
    try {
      const parsed = JSON.parse(testInputJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setTestInputError('Input must be a JSON object');
        return;
      }
      setTestInputJson(`${JSON.stringify(parsed, null, 2)}\n`);
      setTestInputError(null);
    } catch (error) {
      setTestInputError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleRunTest = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(testInputJson);
    } catch (error) {
      setTestInputError(error instanceof Error ? error.message : 'Invalid JSON');
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setTestInputError('Input must be a JSON object');
      return;
    }

    setTestInputError(null);
    try {
      const response = await testValidationScript.mutateAsync({
        script: scriptCode,
        extractedData: parsed as Record<string, unknown>,
        debug: true,
      });
      setTestResponse(response);
    } catch (error) {
      void alert({
        title: 'Test run failed',
        message: getApiErrorText(error, t),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate project selection
    const effectiveProjectId = fixedProjectIdValue || projectId;
    if (!effectiveProjectId && !allowDraft) {
      void alert({ title: 'Validation script', message: 'Please select a project.' });
      return;
    }

    if (isEditing) {
      const updateData: UpdateValidationScriptDto = {
        name: name || undefined,
        script: scriptCode,
        severity: severity,
        enabled: enabled,
        description: description || undefined,
      };
      await onSubmit(updateData);
    } else {
      const data: CreateValidationScriptDto = {
        name,
        script: scriptCode,
        projectId: effectiveProjectId || draftProjectId,
        severity: severity,
        enabled: enabled,
        description: description || undefined,
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Script Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
          placeholder="Tax Calculation Check"
        />
      </div>

      {showProjectField ? (
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-foreground">
            Project *
          </label>
          {fixedProjectIdValue ? (
            <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              {fixedProject?.name ?? `Project #${fixedProjectIdValue}`}
            </div>
          ) : (
            <select
              id="projectId"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!!script}
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:bg-muted disabled:cursor-not-allowed"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id.toString()}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
          Project will be set when you save the wizard.
        </div>
      )}

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
          placeholder="Optional description..."
        />
      </div>

      <div>
        <label htmlFor="severity" className="block text-sm font-medium text-foreground">
          Default Severity
        </label>
        <select
          id="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as ValidationSeverity)}
          className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
        >
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          The default severity level for issues found by this script.
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script" className="block text-sm font-medium text-foreground">
            Validation Script *
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckSyntax}
              disabled={isCheckingSyntax}
              className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingSyntax ? 'Checking...' : 'Check Syntax'}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                !schemaForGeneration ||
                !resolvedProjectForGeneration?.llmModelId ||
                !promptText.trim()
              }
              className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !resolvedProjectForGeneration?.llmModelId
                  ? 'No project LLM model configured'
                  : !schemaForGeneration
                    ? 'No project schema found'
                    : !promptText.trim()
                      ? 'Enter a prompt to generate'
                      : undefined
              }
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <textarea
              id="script"
              required
              value={scriptCode}
              onChange={(e) => handleScriptChange(e.target.value)}
              rows={20}
              className="mt-1 block w-full px-3 py-2 font-mono text-xs border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
              placeholder={DEFAULT_SCRIPT}
            />
          </div>
          <div className="rounded-md border border-border p-3 bg-card">
            <label htmlFor="promptText" className="block text-sm font-medium text-foreground">
              Prompt *
            </label>
            <textarea
              id="promptText"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
              className="mt-1 block w-full px-3 py-2 text-sm border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring"
              placeholder="Describe what validate() should check"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {schemaForGeneration
                ? `Uses schema: ${schemaForGeneration.name}`
                : 'No schema found for this project. Create a schema first to enable generation.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {resolvedProjectForGeneration?.llmModelId
                ? 'Uses the project LLM model automatically.'
                : 'No LLM model configured for this project.'}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-border p-4 bg-card">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-foreground">Test Script</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFormatTestJson}
                className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-muted"
              >
                Format JSON
              </button>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testValidationScript.isPending || !!syntaxError}
                className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title={syntaxError ? 'Fix syntax errors before testing' : undefined}
              >
                {testValidationScript.isPending ? 'Running...' : 'Run Test'}
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor="testInputJson" className="block text-sm font-medium text-foreground">
                Input JSON (extractedData)
              </label>
              <textarea
                id="testInputJson"
                value={testInputJson}
                onChange={(e) => setTestInputJson(e.target.value)}
                rows={10}
                className="mt-1 block w-full px-3 py-2 font-mono text-xs border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring"
                placeholder='{"invoice":{},"items":[]}'
              />
              {testInputError && (
                <pre className="mt-2 text-xs text-destructive whitespace-pre-wrap">{testInputError}</pre>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Use this to test your script without saving or running on a manifest.
              </p>
            </div>
            <div>
              <Tabs defaultValue="issues">
                <TabsList className="mb-3">
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="error">Runtime Error</TabsTrigger>
                </TabsList>
                <TabsContent value="issues">
                  <ValidationResultsPanel
                    result={testResponse?.result ?? null}
                    isLoading={testValidationScript.isPending}
                  />
                </TabsContent>
                <TabsContent value="logs">
                  <div className="rounded-md border border-border bg-card p-3 max-h-96 overflow-y-auto">
                    {(testResponse?.debug?.logs ?? []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No logs.</div>
                    ) : (
                      <div className="space-y-1 font-mono text-xs">
                        {(testResponse?.debug?.logs ?? []).map((entry: ValidationScriptConsoleEntry, index: number) => {
                          const levelClass =
                            entry.level === 'error'
                              ? 'text-destructive'
                              : entry.level === 'warn'
                                ? 'text-[color:var(--status-warning-text)]'
                                : 'text-muted-foreground';
                          return (
                            <div key={index} className="flex gap-2">
                              <span className={`w-12 uppercase ${levelClass}`}>{entry.level}</span>
                              <span className="whitespace-pre-wrap break-words">{entry.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="error">
                  <div className="rounded-md border border-border bg-card p-3 max-h-96 overflow-y-auto">
                    {!testResponse?.runtimeError ? (
                      <div className="text-sm text-muted-foreground">No runtime error.</div>
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap">
                        {testResponse.runtimeError.message}
                        {testResponse.runtimeError.stack ? `\n\n${testResponse.runtimeError.stack}` : ''}
                      </pre>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        {syntaxError && (
          <pre className="mt-1 text-xs text-destructive whitespace-pre-wrap">Syntax Error: {syntaxError}</pre>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          The script must export a function named <code className="bg-muted px-1 rounded">validate</code> that
          takes <code className="bg-muted px-1 rounded">extractedData</code> and returns an array of validation
          issues.
        </p>
      </div>

      <div className="flex items-center">
        <input
          id="enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
        />
        <label htmlFor="enabled" className="ml-2 block text-sm text-foreground">
          Enabled (this script will run automatically when validation is triggered)
        </label>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
        <h4 className="text-sm font-medium text-primary mb-2">Script Function Signature</h4>
        <pre className="text-xs text-primary overflow-x-auto">
          {`function validate(extractedData): ValidationIssue[] {
  return [
    {
      field: string,      // Dot-notation path (e.g., "items[0].price")
      message: string,    // Human-readable error description
      severity: 'warning' | 'error',
      actual?: any,       // Actual value for debugging
      expected?: any,     // Expected value for debugging
    }
  ];
}`}
        </pre>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading || !!syntaxError}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('common.saving') : isEditing ? t('common.update') : t('common.create')}
        </button>
      </div>

      <ModalDialog />
    </form>
  );
}




