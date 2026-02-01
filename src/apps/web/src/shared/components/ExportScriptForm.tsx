import { useEffect, useId, useMemo, useState } from 'react';
import {
  CreateExportScriptDto,
  ExportScript,
  TestExportScriptResponseDto,
  UpdateExportScriptDto,
} from '@/api/export-scripts';
import { useProjects } from '@/shared/hooks/use-projects';
import { useTestExportScript, useValidateExportScriptSyntax } from '@/shared/hooks/use-export-scripts';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { getApiErrorText } from '@/api/client';
import { useI18n } from '@/shared/providers/I18nProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';

interface ExportScriptFormProps {
  script?: ExportScript;
  fixedProjectId?: number;
  showProjectField?: boolean;
  onSubmit: (data: CreateExportScriptDto | UpdateExportScriptDto) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  isLoading?: boolean;
}

const DEFAULT_SCRIPT = `function exportRows(extractedData, ctx) {
  // Return an array of row objects.
  // Tip: You can flatten arrays like items[] by returning 1 row per item.
  // ctx.format is 'csv' or 'xlsx'
  // ctx.schemaColumns is the current x-table-columns list (may be empty)

  return [extractedData];
}`;

export function ExportScriptForm({
  script,
  fixedProjectId,
  showProjectField = true,
  onSubmit,
  onCancel,
  onDirtyChange,
  isLoading,
}: ExportScriptFormProps) {
  const { t } = useI18n();
  const { alert } = useModalDialog();
  const { projects } = useProjects();
  const validateSyntax = useValidateExportScriptSyntax();
  const testExportScript = useTestExportScript();
  const baseId = useId();

  const [name, setName] = useState(script?.name ?? '');
  const [description, setDescription] = useState(script?.description ?? '');
  const fixedProjectIdValue = fixedProjectId ? fixedProjectId.toString() : '';
  const [projectId, setProjectId] = useState(script?.projectId?.toString() ?? fixedProjectIdValue ?? '');
  const [scriptCode, setScriptCode] = useState(script?.script ?? DEFAULT_SCRIPT);
  const [enabled, setEnabled] = useState(script?.enabled ?? true);
  const [priority, setPriority] = useState<string>(script?.priority?.toString() ?? '0');

  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isCheckingSyntax, setIsCheckingSyntax] = useState(false);

  const [testInputJson, setTestInputJson] = useState<string>('{\n  "invoice": {},\n  "items": []\n}\n');
  const [testInputError, setTestInputError] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<TestExportScriptResponseDto | null>(null);

  const isEditing = Boolean(script && script.id > 0);
  const initialProjectId = fixedProjectIdValue ? fixedProjectIdValue : script?.projectId?.toString() ?? (showProjectField ? '' : '');

  useEffect(() => {
    if (fixedProjectIdValue && projectId !== fixedProjectIdValue) {
      setProjectId(fixedProjectIdValue);
    }
  }, [fixedProjectIdValue, projectId]);

  const parsedPriority = useMemo(() => {
    const parsed = Number(priority);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [priority]);

  const isDirty = useMemo(() => {
    return (
      name !== (script?.name ?? '') ||
      description !== (script?.description ?? '') ||
      projectId !== initialProjectId ||
      scriptCode !== (script?.script ?? DEFAULT_SCRIPT) ||
      enabled !== (script?.enabled ?? true) ||
      parsedPriority !== (script?.priority ?? 0)
    );
  }, [description, enabled, initialProjectId, name, parsedPriority, projectId, script, scriptCode]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setTestInputError('Input must be a JSON object');
        return;
      }
      setTestInputError(null);
    } catch (error) {
      setTestInputError(error instanceof Error ? error.message : 'Invalid JSON');
      return;
    }

    try {
      const response = await testExportScript.mutateAsync({
        script: scriptCode,
        extractedData: parsed as Record<string, unknown>,
        debug: true,
        format: 'csv',
      });
      setTestResponse(response);
    } catch (error) {
      void alert({ title: 'Test export script failed', message: getApiErrorText(error, t) });
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      void alert({ title: 'Export script', message: 'Name is required.' });
      return;
    }
    if (!projectId || !projectId.trim()) {
      void alert({ title: 'Export script', message: 'Please select a project.' });
      return;
    }
    if (!scriptCode.trim()) {
      void alert({ title: 'Export script', message: 'Script is required.' });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      projectId: projectId.trim(),
      script: scriptCode,
      enabled,
      priority: parsedPriority,
    } satisfies CreateExportScriptDto;

    if (isEditing) {
      const updateData: UpdateExportScriptDto = {
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        script: data.script,
        enabled: data.enabled,
        priority: data.priority,
      };
      await onSubmit(updateData);
      return;
    }

    await onSubmit(data);
  };

  const previewRows = testResponse?.rows?.slice(0, 20) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor={`${baseId}-name`} className="text-sm font-medium text-foreground">Name *</label>
          <input
            id={`${baseId}-name`}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-ring"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Normalize export rows"
            disabled={Boolean(isLoading)}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={`${baseId}-description`} className="text-sm font-medium text-foreground">Description</label>
          <input
            id={`${baseId}-description`}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-ring"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            disabled={Boolean(isLoading)}
          />
        </div>

        {showProjectField ? (
          <div className="grid gap-1.5">
            <label htmlFor={`${baseId}-project`} className="text-sm font-medium text-foreground">Project *</label>
            <select
              id={`${baseId}-project`}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-ring"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={Boolean(isLoading) || Boolean(fixedProjectIdValue)}
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex gap-3 items-center">
          <label htmlFor={`${baseId}-enabled`} className="text-sm font-medium text-foreground">Enabled</label>
          <input
            id={`${baseId}-enabled`}
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={Boolean(isLoading)}
          />
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor={`${baseId}-priority`} className="text-sm font-medium text-foreground">Priority</label>
            <input
              id={`${baseId}-priority`}
              className="h-9 w-24 rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-ring"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={Boolean(isLoading)}
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">Export Script *</div>
            <div className="text-xs text-muted-foreground">
              Must define <code className="bg-muted px-1 rounded">function exportRows(extractedData, ctx)</code> and return an array.
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={handleCheckSyntax} disabled={isCheckingSyntax || Boolean(isLoading)}>
            {isCheckingSyntax ? 'Checking...' : 'Check Syntax'}
          </Button>
        </div>

        {syntaxError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive whitespace-pre-wrap">
            {syntaxError}
          </div>
        ) : null}

        <textarea
          value={scriptCode}
          onChange={(e) => {
            setScriptCode(e.target.value);
            setSyntaxError(null);
          }}
          className="min-h-[220px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-ring focus:outline-none focus:ring-ring"
          disabled={Boolean(isLoading)}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-foreground">Test Input (JSON)</div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleFormatTestJson} disabled={Boolean(isLoading)}>
              Format
            </Button>
            <Button type="button" onClick={handleRunTest} disabled={testExportScript.isPending || Boolean(isLoading) || Boolean(syntaxError)}>
              {testExportScript.isPending ? 'Running...' : 'Run Test'}
            </Button>
          </div>
        </div>

        {testInputError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {testInputError}
          </div>
        ) : null}

        <textarea
          value={testInputJson}
          onChange={(e) => setTestInputJson(e.target.value)}
          className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-ring focus:outline-none focus:ring-ring"
          disabled={Boolean(isLoading)}
        />

        {testResponse ? (
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-3">
              <div className="text-xs text-muted-foreground mb-2">
                Showing {previewRows.length} of {testResponse.rows.length} rows
              </div>
              <pre className="max-h-[260px] overflow-auto rounded-md border border-border bg-card p-3 text-xs">
                {JSON.stringify(previewRows, null, 2)}
              </pre>
              {testResponse.runtimeError ? (
                <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive whitespace-pre-wrap">
                  {testResponse.runtimeError.message}
                  {testResponse.runtimeError.stack ? `\n${testResponse.runtimeError.stack}` : ''}
                </div>
              ) : null}
            </TabsContent>
            <TabsContent value="logs" className="mt-3">
              <pre className="max-h-[260px] overflow-auto rounded-md border border-border bg-card p-3 text-xs">
                {(testResponse.debug?.logs ?? [])
                  .map((l) => `[${l.level}] ${l.message}`)
                  .join('\n') || '(no logs)'}
              </pre>
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={Boolean(isLoading)}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={Boolean(isLoading)}>
          {isEditing ? 'Save' : 'Create'}
        </Button>
      </div>
    </div>
  );
}
