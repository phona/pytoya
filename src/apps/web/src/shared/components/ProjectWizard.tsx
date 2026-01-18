import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/api/client';
import { CreateProjectDto } from '@/api/projects';
import { schemasApi, SchemaRule } from '@/api/schemas';
import { CreateValidationScriptDto, UpdateValidationScriptDto, ValidationSeverity, ValidationScript } from '@/api/validation';
import { GenerateSchemaModal } from '@/shared/components/GenerateSchemaModal';
import { ImportSchemaModal } from '@/shared/components/ImportSchemaModal';
import { RuleEditor, RuleDraft } from '@/shared/components/RuleEditor';
import { SchemaJsonEditor } from '@/shared/components/SchemaJsonEditor';
import { ValidationScriptForm } from '@/shared/components/ValidationScriptForm';
import { useModels } from '@/shared/hooks/use-models';
import { useProject, useProjects } from '@/shared/hooks/use-projects';
import { useProjectSchemas, useSchemaRules, useSchemas } from '@/shared/hooks/use-schemas';
import { useProjectValidationScripts, useValidationScripts } from '@/shared/hooks/use-validation-scripts';
import { deriveRequiredFields } from '@/shared/utils/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

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

const mapRuleToDraft = (rule: SchemaRule): RuleDraft => ({
  id: rule.id,
  fieldPath: rule.fieldPath ?? '',
  ruleType: rule.ruleType,
  ruleOperator: rule.ruleOperator,
  ruleConfig: rule.ruleConfig ?? {},
  errorMessage: rule.errorMessage ?? undefined,
  priority: rule.priority ?? 0,
  enabled: rule.enabled ?? true,
  description: rule.description ?? undefined,
});

const mapScriptToDraft = (script: ValidationScript): ValidationScriptDraft => ({
  id: script.id,
  name: script.name ?? '',
  description: script.description ?? undefined,
  severity: (script.severity ?? 'warning') as ValidationSeverity,
  enabled: script.enabled ?? true,
  script: script.script ?? '',
});

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

type WizardMode = 'create' | 'edit';

type ProjectWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: number) => void;
  mode?: WizardMode;
  projectId?: number;
};

export function ProjectWizard({ isOpen, onClose, onCreated, mode = 'create', projectId }: ProjectWizardProps) {
  const isEditMode = mode === 'edit';
  const effectiveProjectId = isEditMode ? projectId ?? 0 : 0;
  const { createProject, updateProject } = useProjects();
  const { createSchema, updateSchema } = useSchemas();
  const { createScript, updateScript, deleteScript } = useValidationScripts();
  const queryClient = useQueryClient();
  const { models: ocrModels } = useModels({ category: 'ocr' });
  const { models: llmModels } = useModels({ category: 'llm' });
  const { project: existingProject, isLoading: projectLoading } = useProject(effectiveProjectId);
  const { schemas: projectSchemas, isLoading: projectSchemasLoading } = useProjectSchemas(effectiveProjectId);
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(null);

  const defaultSchema = useMemo(() => {
    if (!isEditMode || !existingProject) return null;
    if (existingProject.defaultSchemaId) {
      return projectSchemas.find((schema) => schema.id === existingProject.defaultSchemaId) ?? null;
    }
    return projectSchemas[0] ?? null;
  }, [existingProject, isEditMode, projectSchemas]);

  const selectedSchema = useMemo(() => {
    if (!selectedSchemaId) return null;
    return projectSchemas.find((schema) => schema.id === selectedSchemaId) ?? null;
  }, [projectSchemas, selectedSchemaId]);

  const { rules: existingRules, isLoading: rulesLoading } = useSchemaRules(selectedSchemaId ?? 0);
  const { scripts: existingScripts, isLoading: scriptsLoading } = useProjectValidationScripts(effectiveProjectId);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useOcr, setUseOcr] = useState(false);
  const [ocrModelId, setOcrModelId] = useState('');
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
  const [activeSchemaId, setActiveSchemaId] = useState<number | null>(null);

  const projectInitializedRef = useRef(false);
  const scriptsInitializedRef = useRef(false);
  const initialRuleIdsRef = useRef<number[]>([]);
  const initialScriptIdsRef = useRef<number[]>([]);
  const lastLoadedSchemaIdRef = useRef<number | null>(null);

  const stepLabels = useMemo(() => {
    return ['Basics', 'Models', 'Schema', 'Rules', 'Validation Scripts', 'Review'];
  }, []);

  const isEditLoading = isEditMode && (projectLoading || projectSchemasLoading || scriptsLoading || (selectedSchemaId ? rulesLoading : false));

  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode || projectInitializedRef.current || !existingProject) return;
    setName(existingProject.name ?? '');
    setDescription(existingProject.description ?? '');
    setUseOcr(Boolean(existingProject.ocrModelId));
    setOcrModelId(existingProject.ocrModelId ?? '');
    setLlmModelId(existingProject.llmModelId ?? '');
    projectInitializedRef.current = true;
  }, [existingProject, isEditMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode || projectSchemasLoading || !existingProject) return;
    if (selectedSchemaId) return;
    if (defaultSchema) {
      setSelectedSchemaId(defaultSchema.id);
      return;
    }
    if (projectSchemas.length > 0) {
      setSelectedSchemaId(projectSchemas[0].id);
      return;
    }
    setSelectedSchemaId(null);
  }, [defaultSchema, existingProject, isEditMode, isOpen, projectSchemas, projectSchemasLoading, selectedSchemaId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode) return;
    if (!selectedSchemaId) {
      setSchemaDraft({
        jsonSchema: DEFAULT_SCHEMA_TEXT,
      });
      setRules([]);
      initialRuleIdsRef.current = [];
      setActiveSchemaId(null);
      lastLoadedSchemaIdRef.current = null;
      return;
    }
    if (rulesLoading) return;
    if (lastLoadedSchemaIdRef.current === selectedSchemaId) return;
    if (!selectedSchema) return;

    setSchemaDraft({
      jsonSchema: JSON.stringify(selectedSchema.jsonSchema ?? {}, null, 2),
    });
    setRules(existingRules.map(mapRuleToDraft));
    initialRuleIdsRef.current = existingRules.map((rule) => rule.id);
    setActiveSchemaId(selectedSchema.id);
    lastLoadedSchemaIdRef.current = selectedSchema.id;
  }, [existingRules, isEditMode, isOpen, rulesLoading, selectedSchema, selectedSchemaId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode || scriptsInitializedRef.current || scriptsLoading) return;
    setValidationScripts(existingScripts.map(mapScriptToDraft));
    initialScriptIdsRef.current = existingScripts.map((script) => script.id);
    scriptsInitializedRef.current = true;
  }, [existingScripts, isEditMode, isOpen, scriptsLoading]);

  const resetWizard = () => {
    setStep(1);
    setName('');
    setDescription('');
    setUseOcr(false);
    setOcrModelId('');
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
    setActiveSchemaId(null);
    setSelectedSchemaId(null);
    projectInitializedRef.current = false;
    scriptsInitializedRef.current = false;
    initialRuleIdsRef.current = [];
    initialScriptIdsRef.current = [];
    lastLoadedSchemaIdRef.current = null;
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetWizard();
    onClose();
  };

  const canContinue = () => {
    if (isEditLoading) return false;
    if (step === 1) {
      return name.trim().length > 0;
    }
    if (step === 2) {
      if (!llmModelId) return false;
      if (useOcr) {
        return Boolean(ocrModelId);
      }
      return true;
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
      ocrModelId: useOcr ? ocrModelId || undefined : undefined,
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
    const existingIds = initialRuleIdsRef.current;
    const currentIds = rules.filter((rule) => rule.id).map((rule) => rule.id as number);
    const deleteIds = existingIds.filter((id) => !currentIds.includes(id));

    const createRules = rules.filter((rule) => !rule.id);
    const updateRules = rules.filter((rule) => rule.id);

    if (createRules.length > 0) {
      await Promise.all(
        createRules.map((rule) =>
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
    }

    if (updateRules.length > 0) {
      await Promise.all(
        updateRules.map((rule) =>
          schemasApi.updateSchemaRule(schemaId, rule.id as number, {
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
    }

    if (deleteIds.length > 0) {
      await Promise.all(
        deleteIds.map((ruleId) => schemasApi.deleteSchemaRule(schemaId, ruleId)),
      );
    }
  };

  const syncValidationScriptsForProject = async (projectIdValue: number) => {
    const existingIds = initialScriptIdsRef.current;
    const currentIds = validationScripts
      .filter((script) => script.id)
      .map((script) => script.id as number);
    const deleteIds = existingIds.filter((id) => !currentIds.includes(id));

    const createScripts = validationScripts.filter((script) => !script.id);
    const updateScripts = validationScripts.filter((script) => script.id);

    if (createScripts.length > 0) {
      await Promise.all(
        createScripts.map((script) =>
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
    }

    if (updateScripts.length > 0) {
      await Promise.all(
        updateScripts.map((script) =>
          updateScript({
            id: script.id as number,
            data: {
              name: script.name,
              script: script.script,
              severity: script.severity,
              enabled: script.enabled,
              description: script.description ?? undefined,
            },
          }),
        ),
      );
    }

    if (deleteIds.length > 0) {
      await Promise.all(deleteIds.map((scriptId) => deleteScript(scriptId)));
    }
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

      await updateProject({
        id: project.id,
        data: {
          defaultSchemaId: createdSchema.id,
          llmModelId: llmModelId,
          ocrModelId: useOcr ? ocrModelId || undefined : undefined,
        },
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

  const handleUpdate = async () => {
    if (!isEditMode || !projectId) return;
    const invalidRulesMessage = getInvalidRulesMessage();
    if (invalidRulesMessage) {
      setError(invalidRulesMessage);
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      if (schemaJsonError) {
        throw new Error('Schema JSON is invalid.');
      }

      const parsedSchema = JSON.parse(schemaDraft.jsonSchema) as Record<string, unknown>;

      await updateProject({
        id: projectId,
        data: buildProjectPayload(),
      });

      let schemaId = activeSchemaId;
      if (schemaId) {
        await updateSchema({
          id: schemaId,
          data: {
            jsonSchema: parsedSchema,
          },
        });
      } else {
        const createdSchema = await createSchema({
          jsonSchema: parsedSchema,
          projectId: projectId,
        });
        schemaId = createdSchema.id;
        setActiveSchemaId(createdSchema.id);
        await updateProject({
          id: projectId,
          data: { ...buildProjectPayload(), defaultSchemaId: createdSchema.id },
        });
      }

      if (schemaId) {
        await syncRulesForSchema(schemaId);
      }
      await syncValidationScriptsForProject(projectId);
      await queryClient.invalidateQueries({ queryKey: ['schemas', 'project', projectId] });
      if (schemaId) {
        await queryClient.invalidateQueries({ queryKey: ['schemas', schemaId, 'rules'] });
      }
      await queryClient.invalidateQueries({ queryKey: ['validation-scripts', 'project', projectId] });

      resetWizard();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update project.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (isEditMode && !projectId) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Project ID is required to edit setup.
        </div>
      );
    }

    if (isEditLoading) {
      return (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          Loading project setup...
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
              Project Name *
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="Invoice Extraction Project"
              required
            />
          </div>
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
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
            <label htmlFor="llm-model" className="block text-sm font-medium text-gray-700">
              LLM Model *
            </label>
            <select
              id="llm-model"
              value={llmModelId}
              onChange={(event) => setLlmModelId(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option value="">Select LLM model...</option>
              {llmModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.isActive ? '' : '(Inactive)'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The selected LLM will generate schema and rules.
            </p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={useOcr}
                onChange={(event) => {
                  setUseOcr(event.target.checked);
                  if (!event.target.checked) {
                    setOcrModelId('');
                  }
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Use OCR before LLM (optional)
            </label>
          </div>
          {useOcr && (
            <div>
              <label htmlFor="ocr-model" className="block text-sm font-medium text-gray-700">
                OCR Model
              </label>
              <select
                id="ocr-model"
                value={ocrModelId}
                onChange={(event) => setOcrModelId(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">Select OCR model...</option>
                {ocrModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.isActive ? '' : '(Inactive)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          {isEditMode && (
            <div>
              <label htmlFor="schema-select" className="block text-sm font-medium text-gray-700">
                Schema
              </label>
              <select
                id="schema-select"
                value={selectedSchemaId ? selectedSchemaId.toString() : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedSchemaId(value ? Number(value) : null);
                }}
                disabled={projectSchemas.length === 0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
              >
                <option value="">
                  {projectSchemas.length === 0 ? 'No schemas available' : 'Select a schema...'}
                </option>
                {projectSchemas.map((schema) => (
                  <option key={schema.id} value={schema.id}>
                    {schema.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Switching schemas loads its JSON Schema and rules.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Generate by LLM
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Import File
            </button>
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
            <label htmlFor="rule-description" className="block text-sm font-medium text-gray-700">
              Describe validation requirements
            </label>
            <textarea
              id="rule-description"
              value={rulesDescription}
              onChange={(event) => setRulesDescription(event.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="PO number must be 7 digits. Units should be KG, EA, or M. Apply OCR corrections for common errors."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleGenerateRules(rulesDescription.trim())}
              disabled={isGeneratingRules || !rulesDescription.trim()}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isGeneratingRules ? 'Generating...' : 'Generate Rules'}
            </button>
            <button
              type="button"
              onClick={() => handleGenerateRules('Generate validation rules for this schema.')}
              disabled={isGeneratingRules}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Auto-Generate All
            </button>
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
              <h3 className="text-sm font-semibold text-gray-900">Validation Scripts</h3>
              <p className="text-sm text-gray-600">
                Add validation scripts that run after extraction for this project.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddScript}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New Script
            </button>
          </div>

          {validationScripts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No validation scripts yet. Add one to enforce project-specific checks.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {validationScripts.map((script, index) => (
                <div
                  key={script.id ?? `draft-${index}`}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {script.name || 'Untitled Script'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            script.severity === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {script.severity}
                        </span>
                        {!script.enabled && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                            Disabled
                          </span>
                        )}
                      </div>
                      {script.description && (
                        <p className="mt-1 text-sm text-gray-600">{script.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditScript(script)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveScript(script)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
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
      <div className="space-y-4 text-sm text-gray-700">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Project</div>
          <div className="mt-1">{name}</div>
          {description && <div className="mt-1 text-gray-500">{description}</div>}
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Models</div>
          <div className="mt-1 text-gray-500">OCR: {useOcr ? ocrModelId || 'None' : 'None'}</div>
          <div className="text-gray-500">LLM: {llmModelId || 'None'}</div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Schema</div>
          <div className="mt-1 text-gray-500">JSON Schema</div>
          <div className="mt-2 text-xs text-gray-500">Required fields: {requiredCount}</div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Rules</div>
          <div className="mt-1 text-gray-500">{rules.length} rule{rules.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Validation Scripts</div>
          <div className="mt-1 text-gray-500">
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
          <DialogTitle>{isEditMode ? 'Project Setup' : 'Create Project'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update project settings, schema, rules, and validation scripts.'
              : 'Set up models, schema, rules, and validation scripts in a guided flow.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500">
            {stepLabels.map((label, index) => (
              <div
                key={label}
                className={`rounded-full px-3 py-1 ${
                  step === index + 1
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {renderStep()}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Step {step} of {stepLabels.length}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                disabled={step === 1 || isSubmitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              {step < stepLabels.length ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={!canContinue() || isSubmitting}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isEditMode ? handleUpdate : handleCreate}
                  disabled={isSubmitting}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting
                    ? isEditMode
                      ? 'Saving...'
                      : 'Creating...'
                    : isEditMode
                      ? 'Save Changes'
                      : 'Create Project'}
                </button>
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
                  ? mapDraftToScriptForm(editingValidationScript, effectiveProjectId)
                  : undefined
              }
              fixedProjectId={isEditMode ? effectiveProjectId : undefined}
              showProjectField={isEditMode}
              allowDraft={!isEditMode}
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
