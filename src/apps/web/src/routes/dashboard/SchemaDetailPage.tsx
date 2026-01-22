import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getApiErrorText } from '@/api/client';
import { useSchema, useSchemaRules, useSchemas, useValidateWithRequired } from '@/shared/hooks/use-schemas';
import { SchemaRule, SchemaRuleOperator, UpdateSchemaDto, ValidateSchemaDto } from '@/api/schemas';
import { SchemaForm } from '@/shared/components/SchemaForm';
import { SchemaPreview } from '@/shared/components/SchemaPreview';
import { RuleEditor, RuleDraft } from '@/shared/components/RuleEditor';
import { Button } from '@/shared/components/ui/button';
import { canonicalizeJsonSchemaForDisplay, deriveRequiredFields } from '@/shared/utils/schema';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { useI18n } from '@/shared/providers/I18nProvider';

export function SchemaDetailPage() {
  const { confirm, alert, ModalDialog } = useModalDialog();
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const schemaId = Number(params.id);
  const { schema, isLoading } = useSchema(schemaId);
  const { updateSchema, deleteSchema, isUpdating, isDeleting } = useSchemas();
  const {
    rules,
    isLoading: rulesLoading,
    createRule,
    updateRule,
    deleteRule,
    isCreating: isCreatingRule,
    isUpdating: isUpdatingRule,
    isDeleting: isDeletingRule,
  } = useSchemaRules(schemaId);
  const validateSchema = useValidateWithRequired();

  const [isEditing, setIsEditing] = useState(false);
  const [testData, setTestData] = useState('{}');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors?: string[] } | null>(null);
  const [draftRules, setDraftRules] = useState<RuleDraft[]>([]);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const tabValue = searchParams.get('tab') === 'rules' ? 'rules' : 'schema';
  const projectIdFromQuery = Number(searchParams.get('projectId'));
  const requiredFields = useMemo(() => {
    if (!schema) return [];
    return deriveRequiredFields(schema.jsonSchema as Record<string, unknown>);
  }, [schema]);
  const projectLink = (() => {
    if (schema?.projectId) {
      return `/projects/${schema.projectId}`;
    }
    if (Number.isFinite(projectIdFromQuery)) {
      return `/projects/${projectIdFromQuery}`;
    }
    return '/projects';
  })();

  useEffect(() => {
    const nextRules = (rules ?? []).map((rule: SchemaRule): RuleDraft => ({
      id: rule.id,
      fieldPath: rule.fieldPath,
      ruleType: rule.ruleType,
      ruleOperator: rule.ruleOperator,
      ruleConfig: rule.ruleConfig ?? {},
      errorMessage: rule.errorMessage ?? undefined,
      priority: rule.priority,
      enabled: rule.enabled,
      description: rule.description ?? undefined,
    }));
    setDraftRules(nextRules);
  }, [rules]);

  const handleTabChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'rules') {
      nextParams.set('tab', 'rules');
      setIsEditing(false);
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams);
  };

  const handleRulesChange = (nextRules: RuleDraft[]) => {
    const removedRules = draftRules.filter(
      (rule) => rule.id && !nextRules.some((next) => next.id === rule.id),
    );
    removedRules.forEach((rule) => {
      if (rule.id) {
        void deleteRule(rule.id);
      }
    });
    setDraftRules(nextRules);
  };

  const buildRulePayload = (rule: RuleDraft) => {
    const trimmedFieldPath = rule.fieldPath?.trim() ?? '';
    const fieldPath = trimmedFieldPath || (rule.ruleOperator === SchemaRuleOperator.OCR_CORRECTION ? '*' : '');
    return {
      schemaId,
      fieldPath,
      ruleType: rule.ruleType,
      ruleOperator: rule.ruleOperator,
      ruleConfig: rule.ruleConfig ?? {},
      errorMessage: rule.errorMessage?.trim() ? rule.errorMessage.trim() : undefined,
      priority: typeof rule.priority === 'number' ? rule.priority : undefined,
      enabled: rule.enabled ?? undefined,
      description: rule.description?.trim() ? rule.description.trim() : undefined,
    };
  };

  const handleSaveRules = async () => {
    setRulesError(null);
    const invalid = draftRules.find((rule) => {
      const trimmedFieldPath = rule.fieldPath?.trim() ?? '';
      return !trimmedFieldPath && rule.ruleOperator !== SchemaRuleOperator.OCR_CORRECTION;
    });
    if (invalid) {
      setRulesError('Field path is required for all rules.');
      return;
    }

    setIsSavingRules(true);
    try {
      const nextRules = [...draftRules];
      for (let i = 0; i < draftRules.length; i += 1) {
        const rule = draftRules[i];
        const payload = buildRulePayload(rule);
        if (rule.id) {
          await updateRule({ ruleId: rule.id, data: payload });
        } else {
          const created = await createRule(payload);
          nextRules[i] = { ...rule, id: created.id };
        }
      }
      setDraftRules(nextRules);
    } finally {
      setIsSavingRules(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Schema not found</h2>
          <button
            onClick={() => navigate(projectLink)}
            className="mt-4 text-primary hover:text-primary"
          >
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  const handleUpdate = async (data: UpdateSchemaDto) => {
    try {
      await updateSchema({ id: schemaId, data });
      setIsEditing(false);
    } catch (error) {
      void alert({
        title: 'Update schema failed',
        message: getApiErrorText(error, t),
      });
    }
  };

  const handleValidate = async () => {
    try {
      const data = JSON.parse(testData);
      const validateDto: ValidateSchemaDto = {
        jsonSchema: schema.jsonSchema,
        data,
      };
      const result = await validateSchema.mutateAsync(validateDto);
      setValidationResult(result);
    } catch {
      setValidationResult({ valid: false, errors: ['Invalid test data JSON'] });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete schema',
      message: 'Are you sure you want to delete this schema?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteSchema(schemaId);
      navigate(projectLink);
    } catch (error) {
      void alert({
        title: 'Delete schema failed',
        message: getApiErrorText(error, t),
      });
    }
  };

  return (
    <ProjectSettingsShell
      projectId={schema.projectId}
      schemaIdOverride={schemaId}
      activeTab={tabValue === 'rules' ? 'rules' : 'schema'}
    >
      <div className="mb-8">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{schema.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {`Project ID: ${schema.projectId}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (tabValue !== 'schema') {
                  handleTabChange('schema');
                }
                setIsEditing((prev) => !prev);
              }}
              disabled={isUpdating || isDeleting}
              className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Schema'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isUpdating || isDeleting}
              className="px-4 py-2 border border-destructive/40 rounded-md shadow-sm text-sm font-medium text-destructive bg-card hover:bg-destructive/10"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {tabValue === 'schema' ? (
        isEditing ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Edit Schema</h2>
            <SchemaForm
              schema={schema}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={isUpdating}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Schema Information</h2>
              {schema.description && (
                <p className="text-foreground mb-4">{schema.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">Required Fields:</span>{' '}
                  <span className="text-foreground">{requiredFields.length}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Created:</span>{' '}
                  <span className="text-foreground">{format(new Date(schema.createdAt), 'PP')}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Updated:</span>{' '}
                  <span className="text-foreground">{format(new Date(schema.updatedAt), 'PP')}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">JSON Schema</h2>
              <pre className="bg-background p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(
                  canonicalizeJsonSchemaForDisplay(schema.jsonSchema as Record<string, unknown>),
                  null,
                  2,
                )}
              </pre>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Schema Preview</h2>
              <SchemaPreview schema={schema.jsonSchema as Record<string, unknown>} />
            </div>

            {requiredFields.length > 0 && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Required Fields</h2>
                <ul className="space-y-1">
                  {requiredFields.map((field) => (
                    <li key={field} className="text-sm text-foreground">
                      <code className="bg-muted px-2 py-1 rounded">{field}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Test Validation</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="testData" className="block text-sm font-medium text-foreground">
                    Test Data (JSON)
                  </label>
                  <textarea
                    id="testData"
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    rows={8}
                    className="mt-1 block w-full px-3 py-2 font-mono text-xs border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring"
                    placeholder='{"field": "value"}'
                  />
                </div>
                <button
                  onClick={handleValidate}
                  disabled={validateSchema.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validateSchema.isPending ? 'Validating...' : 'Validate'}
                </button>

                {validationResult && (
                  <div className={`mt-4 p-4 rounded-md ${
                    validationResult.valid
                      ? 'bg-[color:var(--status-completed-bg)] border border-border'
                      : 'bg-destructive/10 border border-destructive/30'
                  }`}>
                    <p className={`font-medium ${
                      validationResult.valid ? 'text-[color:var(--status-completed-text)]' : 'text-destructive'
                    }`}>
                      {validationResult.valid ? '? Valid' : '? Invalid'}
                    </p>
                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-destructive list-disc list-inside">
                        {validationResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Rules</h2>
              <p className="text-sm text-muted-foreground">
                Define validation rules that run after extraction.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleSaveRules}
              disabled={rulesLoading || isSavingRules || isCreatingRule || isUpdatingRule || isDeletingRule}
            >
              {isSavingRules ? 'Saving...' : 'Save Rules'}
            </Button>
          </div>
          {rulesError && (
            <p className="mb-3 text-sm text-destructive">{rulesError}</p>
          )}
          {rulesLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : (
            <RuleEditor rules={draftRules} onChange={handleRulesChange} />
          )}
        </div>
      )}

      <ModalDialog />
    </ProjectSettingsShell>
  );
}
