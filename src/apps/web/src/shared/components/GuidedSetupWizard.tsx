import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/api/client';
import { CreateProjectDto } from '@/api/projects';
import { schemasApi } from '@/api/schemas';
import {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidationSeverity,
  ValidationScript,
} from '@/api/validation';
import { GenerateSchemaModal } from '@/shared/components/GenerateSchemaModal';
import { ImportSchemaModal } from '@/shared/components/ImportSchemaModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { RuleEditor, RuleDraft } from '@/shared/components/RuleEditor';
import { SchemaJsonEditor } from '@/shared/components/SchemaJsonEditor';
import { ValidationScriptForm } from '@/shared/components/ValidationScriptForm';
import { useModels } from '@/shared/hooks/use-models';
import { useExtractors } from '@/shared/hooks/use-extractors';
import { useProjects } from '@/shared/hooks/use-projects';
import { useSchemas } from '@/shared/hooks/use-schemas';
import { useValidationScripts } from '@/shared/hooks/use-validation-scripts';
import { deriveRequiredFields } from '@/shared/utils/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

const DEFAULT_SCHEMA_TEXT = JSON.stringify(
  {
    type: 'object',
    properties: {},
    required: [],
  },
  null,
  2,
);
const DEFAULT_VALIDATION_SCRIPT = `function validate(extractedData) {
  return [];
}`;

const mapDraftToScriptForm = (
  draft: ValidationScriptDraft,
  projectIdValue: number,
): ValidationScript => ({
  id: draft.id ?? -1,
  projectId: projectIdValue,
  name: draft.name ?? '',
  description: draft.description ?? null,
  severity: draft.severity,
  enabled: draft.enabled,
  script: draft.script ?? '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createEmptyScript = (): ValidationScriptDraft => ({
  name: '',
  description: '',
  severity: 'warning' as ValidationSeverity,
  enabled: true,
  script: DEFAULT_VALIDATION_SCRIPT,
});

type SchemaDraft = {
  jsonSchema: string;
};

type ValidationScriptDraft = {
  id?: number;
  name: string;
  description?: string;
  severity: ValidationSeverity;
  enabled: boolean;
  script: string;
};

export type GuidedSetupWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: number) => void;
};

export function GuidedSetupWizard({ isOpen, onClose, onCreated }: GuidedSetupWizardProps) {
  const { createProject } = useProjects();
  const { createSchema } = useSchemas();
  const { createScript } = useValidationScripts();
  const queryClient = useQueryClient();
  const { extractors } = useExtractors();
  const { models: llmModels } = useModels({ category: 'llm' });

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [textExtractorId, setTextExtractorId] = useState('');
  const [llmModelId, setLlmModelId] = useState('');
  const [schemaDraft, setSchemaDraft] = useState<SchemaDraft>({
    jsonSchema: DEFAULT_SCHEMA_TEXT,
  });
  const [schemaJsonError, setSchemaJsonError] = useState<string | null>(null);
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [rulesDescription, setRulesDescription] = useState('');
  const [validationScripts, setValidationScripts] = useState<ValidationScriptDraft[]>([]);
  const [editingValidationScript, setEditingValidationScript] = useState<ValidationScriptDraft | null>(null);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);

  const stepLabels = useMemo(() => {
    return ['Basics', 'Extractor + LLM', 'Schema', 'Rules', 'Validation Scripts', 'Review'];
  }, []);

  const resetWizard = () => {
    setStep(1);
    setName('');
    setDescription('');
    setTextExtractorId('');
    setLlmModelId('');
    setSchemaDraft({
      jsonSchema: DEFAULT_SCHEMA_TEXT,
    });
    setSchemaJsonError(null);
    setRules([]);
    setRulesDescription('');
    setValidationScripts([]);
    setEditingValidationScript(null);
    setIsScriptDialogOpen(false);
    setShowGenerateModal(false);
    setShowImportModal(false);
    setError(null);
    setIsSubmitting(false);
    setIsGeneratingRules(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetWizard();
    onClose();
  };

  const canContinue = () => {
    if (step === 1) {
      return name.trim().length > 0;
    }
    if (step === 2) {
      return Boolean(textExtractorId) && Boolean(llmModelId);
    }
    if (step === 3) {
      return !schemaJsonError;
    }
    return true;
  };

  const getInvalidRulesMessage = () => {
    const invalidRule = rules.find((rule) => !rule.fieldPath || !rule.fieldPath.trim());
    if (invalidRule) {
      return 'Rule field path cannot be empty.';
    }
    return null;
  };

  const buildProjectPayload = (): CreateProjectDto => {
    return {
      name: name.trim(),
      description: description.trim() || undefined,
      textExtractorId,
      llmModelId: llmModelId,
    };
  };

  const handleGenerateSchema = async (prompt: string, includeHints: boolean) => {
    if (!llmModelId) {
      setError('Select an LLM model before generating a schema.');
      return;
    }
    setError(null);
    const result = await schemasApi.generateSchema({
      description: prompt,
      modelId: llmModelId,
      includeExtractionHints: includeHints,
    });
    const nextSchema = JSON.stringify(result.jsonSchema, null, 2);
    setSchemaDraft((prev) => ({
      ...prev,
      jsonSchema: nextSchema,
    }));
  };

  const handleImportSchema = async (file: File) => {
    setError(null);
    const result = await schemasApi.importSchema({ file });
    if (!result.valid || !result.jsonSchema) {
      const message = result.errors?.[0]?.message ?? 'Import failed.';
      setError(message);
      return;
    }
    setSchemaDraft((prev) => ({
      ...prev,
      jsonSchema: JSON.stringify(result.jsonSchema, null, 2),
    }));
  };

  const handleGenerateRules = async (descriptionText: string) => {
    if (!llmModelId) {
      setError('Select an LLM model before generating rules.');
      return;
    }
    setError(null);
    setIsGeneratingRules(true);
    try {
      const parsedSchema = JSON.parse(schemaDraft.jsonSchema) as Record<string, unknown>;
      const result = await schemasApi.generateRulesFromSchema({
        description: descriptionText,
        modelId: llmModelId,
        jsonSchema: parsedSchema,
      });
      setRules(result.rules as RuleDraft[]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate rules.'));
    } finally {
      setIsGeneratingRules(false);
    }
  };

  const handleAddScript = () => {
    setEditingValidationScript(createEmptyScript());
    setIsScriptDialogOpen(true);
  };

  const handleEditScript = (script: ValidationScriptDraft) => {
    setEditingValidationScript(script);
    setIsScriptDialogOpen(true);
  };

  const handleSaveScript = async (
    data: CreateValidationScriptDto | UpdateValidationScriptDto,
  ) => {
    if (!editingValidationScript) return;
    const nextDraft: ValidationScriptDraft = {
      ...editingValidationScript,
      name: data.name ?? editingValidationScript.name,
      description: data.description ?? editingValidationScript.description,
      severity: data.severity ?? editingValidationScript.severity,
      enabled: data.enabled ?? editingValidationScript.enabled,
      script: data.script ?? editingValidationScript.script,
    };
    setValidationScripts((prev) => {
      if (editingValidationScript.id) {
        return prev.map((item) => (item.id === editingValidationScript.id ? nextDraft : item));
      }
      return [...prev, nextDraft];
    });
    setEditingValidationScript(null);
    setIsScriptDialogOpen(false);
  };

  const handleRemoveScript = (script: ValidationScriptDraft) => {
    setValidationScripts((prev) =>
      prev.filter((item) => (script.id ? item.id !== script.id : item !== script)),
    );
  };

  const syncRulesForSchema = async (schemaId: number) => {
    if (rules.length === 0) return;
    await Promise.all(
      rules.map((rule) =>
        schemasApi.createSchemaRule(schemaId, {
          schemaId,
          fieldPath: rule.fieldPath,
          ruleType: rule.ruleType,
          ruleOperator: rule.ruleOperator,
          ruleConfig: rule.ruleConfig ?? {},
          errorMessage: rule.errorMessage,
          priority: rule.priority,
          enabled: rule.enabled,
          description: rule.description,
        }),
      ),
    );
  };

  const syncValidationScriptsForProject = async (projectIdValue: number) => {
    if (validationScripts.length === 0) return;
    await Promise.all(
      validationScripts.map((script) =>
        createScript({
          name: script.name,
          script: script.script,
          projectId: projectIdValue.toString(),
          severity: script.severity,
          enabled: script.enabled,
          description: script.description ?? undefined,
        }),
      ),
    );
  };

  const handleCreate = async () => {
    const invalidRulesMessage = getInvalidRulesMessage();
    if (invalidRulesMessage) {
      setError(invalidRulesMessage);
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      if (!onCreated) {
        throw new Error('Missing onCreated handler for create mode.');
      }
      if (schemaJsonError) {
        throw new Error('Schema JSON is invalid.');
      }
      const project = await createProject(buildProjectPayload());

      const parsedSchema = JSON.parse(schemaDraft.jsonSchema) as Record<string, unknown>;
      const createdSchema = await createSchema({
        jsonSchema: parsedSchema,
        projectId: project.id,
      });

      await syncRulesForSchema(createdSchema.id);
      await syncValidationScriptsForProject(project.id);
      await queryClient.invalidateQueries({ queryKey: ['schemas', 'project', project.id] });
      await queryClient.invalidateQueries({ queryKey: ['schemas', createdSchema.id, 'rules'] });
      await queryClient.invalidateQueries({ queryKey: ['validation-scripts', 'project', project.id] });

      onCreated(project.id);
      resetWizard();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to create project.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-foreground">
              Project Name *
            </label>
            <Input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1"
              placeholder="Invoice Extraction Project"
              required
            />
          </div>
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Optional description..."
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="text-extractor" className="block text-sm font-medium text-foreground">
              Text Extractor *
            </label>
            <Select value={textExtractorId} onValueChange={setTextExtractorId}>
              <SelectTrigger id="text-extractor" className="mt-1">
                <SelectValue placeholder="Select text extractor..." />
              </SelectTrigger>
              <SelectContent>
                {extractors.map((extractor) => (
                  <SelectItem key={extractor.id} value={extractor.id}>
                    {extractor.name} {extractor.isActive ? '' : '(Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose the extractor used to turn documents into text.
            </p>
          </div>
          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-foreground">
              LLM Model *
            </label>
            <Select value={llmModelId} onValueChange={setLlmModelId}>
              <SelectTrigger id="llm-model" className="mt-1">
                <SelectValue placeholder="Select LLM model..." />
              </SelectTrigger>
              <SelectContent>
                {llmModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} {model.isActive ? '' : '(Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              The selected LLM will generate schema and rules.
            </p>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              variant="outline"
            >
              Generate by LLM
            </Button>
            <Button
              type="button"
              onClick={() => setShowImportModal(true)}
              variant="outline"
            >
              Import File
            </Button>
          </div>

          <SchemaJsonEditor
            value={schemaDraft.jsonSchema}
            onChange={(nextValue) =>
              setSchemaDraft((prev) => ({
                ...prev,
                jsonSchema: nextValue,
              }))
            }
            onError={setSchemaJsonError}
            onValidate={(schema) =>
              schemasApi.validateSchemaDefinition({ jsonSchema: schema })
            }
            rows={16}
          />
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-6">
          <div>
            <label htmlFor="rule-description" className="block text-sm font-medium text-foreground">
              Describe validation requirements
            </label>
            <Textarea
              id="rule-description"
              value={rulesDescription}
              onChange={(event) => setRulesDescription(event.target.value)}
              rows={4}
              className="mt-1"
              placeholder="PO number must be 7 digits. Units should be KG, EA, or M. Apply OCR corrections for common errors."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => handleGenerateRules(rulesDescription.trim())}
              disabled={isGeneratingRules || !rulesDescription.trim()}
              variant="outline"
            >
              {isGeneratingRules ? 'Generating...' : 'Generate Rules'}
            </Button>
            <Button
              type="button"
              onClick={() => handleGenerateRules('Generate validation rules for this schema.')}
              disabled={isGeneratingRules}
              variant="outline"
            >
              Auto-Generate All
            </Button>
          </div>

          <RuleEditor rules={rules} onChange={setRules} />
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Validation Scripts</h3>
              <p className="text-sm text-muted-foreground">
                Add validation scripts that run after extraction for this project.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAddScript}
            >
              New Script
            </Button>
          </div>

          {validationScripts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6">
              <EmptyState
                title="No validation scripts"
                description="Add one to enforce project-specific checks."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {validationScripts.map((script, index) => (
                <div
                  key={script.id ?? `draft-${index}`}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {script.name || 'Untitled Script'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            script.severity === 'error'
                              ? 'bg-[color:var(--status-failed-bg)] text-[color:var(--status-failed-text)]'
                              : 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-text)]'
                          }`}
                        >
                          {script.severity}
                        </span>
                        {!script.enabled && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground">
                            Disabled
                          </span>
                        )}
                      </div>
                      {script.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{script.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => handleEditScript(script)}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleRemoveScript(script)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const requiredCount = (() => {
      try {
        const parsed = JSON.parse(schemaDraft.jsonSchema) as Record<string, unknown>;
        return deriveRequiredFields(parsed).length;
      } catch {
        return 0;
      }
    })();

    return (
      <div className="space-y-4 text-sm text-foreground">
        <div className="rounded-md border border-border p-4">
          <div className="font-semibold">Project</div>
          <div className="mt-1">{name}</div>
          {description && <div className="mt-1 text-muted-foreground">{description}</div>}
        </div>
        <div className="rounded-md border border-border p-4">
          <div className="font-semibold">Extraction Setup</div>
          <div className="mt-1 text-muted-foreground">Extractor: {textExtractorId || 'None'}</div>
          <div className="text-muted-foreground">LLM: {llmModelId || 'None'}</div>
        </div>
        <div className="rounded-md border border-border p-4">
          <div className="font-semibold">Schema</div>
          <div className="mt-1 text-muted-foreground">JSON Schema</div>
          <div className="mt-2 text-xs text-muted-foreground">Required fields: {requiredCount}</div>
        </div>
        <div className="rounded-md border border-border p-4">
          <div className="font-semibold">Rules</div>
          <div className="mt-1 text-muted-foreground">{rules.length} rule{rules.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-md border border-border p-4">
          <div className="font-semibold">Validation Scripts</div>
          <div className="mt-1 text-muted-foreground">
            {validationScripts.length} script{validationScripts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Guided Project Setup</DialogTitle>
          <DialogDescription>
            Set up models, schema, rules, and validation scripts in a guided flow.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            {stepLabels.map((label, index) => (
              <div
                key={label}
                className={`rounded-full px-3 py-1 ${
                  step === index + 1
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {renderStep()}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Step {step} of {stepLabels.length}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                disabled={step === 1 || isSubmitting}
                variant="outline"
              >
                Back
              </Button>
              {step < stepLabels.length ? (
                <Button
                  type="button"
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={!canContinue() || isSubmitting}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <GenerateSchemaModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateSchema}
      />
      <ImportSchemaModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSchema}
      />

      {editingValidationScript && (
        <Dialog
          open={isScriptDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsScriptDialogOpen(false);
              setEditingValidationScript(null);
            } else {
              setIsScriptDialogOpen(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingValidationScript.id ? 'Edit Validation Script' : 'New Validation Script'}
              </DialogTitle>
              <DialogDescription>
                Configure validation logic that runs after extraction.
              </DialogDescription>
            </DialogHeader>
            <ValidationScriptForm
              script={
                editingValidationScript
                  ? mapDraftToScriptForm(editingValidationScript, -1)
                  : undefined
              }
              showProjectField={false}
              allowDraft={true}
              draftProjectId="draft"
              onSubmit={handleSaveScript}
              onCancel={() => {
                setIsScriptDialogOpen(false);
                setEditingValidationScript(null);
              }}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}




