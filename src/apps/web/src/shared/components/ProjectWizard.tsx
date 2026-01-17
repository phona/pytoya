import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/api/client';
import { extractionApi } from '@/api/extraction';
import { CreateProjectDto } from '@/api/projects';
import { ExtractionStrategy } from '@/api/schemas';
import { Dialog } from '@/shared/components/Dialog';
import { ExtractionStrategySelector } from '@/shared/components/ExtractionStrategySelector';
import { SchemaVisualBuilder } from '@/shared/components/SchemaVisualBuilder';
import { useModels } from '@/shared/hooks/use-models';
import { useProjects } from '@/shared/hooks/use-projects';
import { useSchemaTemplates, useSchemas } from '@/shared/hooks/use-schemas';

type StrategyType = 'schema' | 'prompt';

type SchemaDraft = {
  name: string;
  description: string;
  jsonSchema: Record<string, unknown>;
  requiredFields: string;
  extractionStrategy: ExtractionStrategy | null;
};

type ProjectWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (projectId: number) => void;
};

const DEFAULT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {},
  required: [],
};

export function ProjectWizard({ isOpen, onClose, onCreated }: ProjectWizardProps) {
  const { createProject, updateProject } = useProjects();
  const { createSchema, schemas } = useSchemas();
  const { templates } = useSchemaTemplates();
  const { models: ocrModels } = useModels({ category: 'ocr' });
  const { models: llmModels } = useModels({ category: 'llm' });

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<StrategyType | null>(null);
  const [schemaMode, setSchemaMode] = useState<'existing' | 'new'>('existing');
  const [existingSchemaId, setExistingSchemaId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [schemaDraft, setSchemaDraft] = useState<SchemaDraft>({
    name: '',
    description: '',
    jsonSchema: DEFAULT_SCHEMA,
    requiredFields: '',
    extractionStrategy: null,
  });
  const [promptDescription, setPromptDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [ocrModelId, setOcrModelId] = useState('');
  const [llmModelId, setLlmModelId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepLabels = useMemo(() => {
    return [
      'Basics',
      'Strategy',
      strategy === 'prompt' ? 'Prompt' : 'Schema',
      'Models',
      'Review',
    ];
  }, [strategy]);

  const resetWizard = () => {
    setStep(1);
    setName('');
    setDescription('');
    setStrategy(null);
    setSchemaMode('existing');
    setExistingSchemaId(null);
    setSelectedTemplateId('');
    setSchemaDraft({
      name: '',
      description: '',
      jsonSchema: DEFAULT_SCHEMA,
      requiredFields: '',
      extractionStrategy: null,
    });
    setPromptDescription('');
    setPromptText('');
    setOcrModelId('');
    setLlmModelId('');
    setError(null);
    setIsOptimizing(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetWizard();
    onClose();
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id.toString() === templateId);
    if (!template) {
      setSchemaDraft((prev) => ({
        ...prev,
        jsonSchema: DEFAULT_SCHEMA,
        requiredFields: '',
      }));
      return;
    }
    setSchemaDraft((prev) => ({
      ...prev,
      jsonSchema: template.jsonSchema ?? DEFAULT_SCHEMA,
      requiredFields: template.requiredFields?.join('\n') ?? '',
    }));
  };

  const canContinue = () => {
    if (step === 1) {
      return name.trim().length > 0;
    }
    if (step === 2) {
      return strategy !== null;
    }
    if (step === 3 && strategy === 'schema') {
      if (schemaMode === 'existing') {
        return Boolean(existingSchemaId);
      }
      return schemaDraft.name.trim().length > 0;
    }
    if (step === 3 && strategy === 'prompt') {
      return promptText.trim().length > 0;
    }
    return true;
  };

  const handleOptimizePrompt = async () => {
    if (!promptDescription.trim()) {
      setError('Describe the extraction requirements to generate a prompt.');
      return;
    }
    setError(null);
    setIsOptimizing(true);
    try {
      const result = await extractionApi.optimizePrompt({
        description: promptDescription.trim(),
      });
      setPromptText(result.prompt);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to optimize prompt.'));
    } finally {
      setIsOptimizing(false);
    }
  };

  const buildProjectPayload = (): CreateProjectDto => {
    const payload: CreateProjectDto = {
      name: name.trim(),
      description: description.trim() || undefined,
      ocrModelId: ocrModelId || undefined,
      llmModelId: llmModelId || undefined,
    };

    if (strategy === 'prompt') {
      payload.prompt = promptText.trim();
    }

    if (strategy === 'schema' && schemaMode === 'existing' && existingSchemaId) {
      payload.defaultSchemaId = existingSchemaId;
    }

    return payload;
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const project = await createProject(buildProjectPayload());
      if (strategy === 'schema' && schemaMode === 'new') {
        const requiredFields = schemaDraft.requiredFields
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean);
        const createdSchema = await createSchema({
          name: schemaDraft.name.trim(),
          description: schemaDraft.description.trim() || undefined,
          jsonSchema: schemaDraft.jsonSchema,
          requiredFields,
          projectId: project.id,
          isTemplate: false,
          extractionStrategy: schemaDraft.extractionStrategy ?? undefined,
        });
        await updateProject({
          id: project.id,
          data: { defaultSchemaId: createdSchema.id },
        });
      }
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
          <p className="text-sm text-gray-600">
            Choose how extraction rules are defined for this project.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setStrategy('schema')}
              className={`rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                strategy === 'schema'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="font-semibold">Schema-based extraction</div>
              <div className="mt-1 text-xs text-gray-500">
                Use JSON Schemas and required fields for structured validation.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStrategy('prompt')}
              className={`rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                strategy === 'prompt'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="font-semibold">Prompt-based extraction</div>
              <div className="mt-1 text-xs text-gray-500">
                Use a custom prompt optimized by the LLM.
              </div>
            </button>
          </div>
        </div>
      );
    }

    if (step === 3 && strategy === 'schema') {
      return (
        <div className="space-y-6">
          <div>
            <div className="block text-sm font-medium text-gray-700">
              Schema setup
            </div>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setSchemaMode('existing')}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  schemaMode === 'existing'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 text-gray-600 hover:border-indigo-300'
                }`}
              >
                Use existing schema
              </button>
              <button
                type="button"
                onClick={() => setSchemaMode('new')}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  schemaMode === 'new'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 text-gray-600 hover:border-indigo-300'
                }`}
              >
                Create new schema
              </button>
            </div>
          </div>

          {schemaMode === 'existing' ? (
            <div>
              <label htmlFor="schema-select" className="block text-sm font-medium text-gray-700">
                Select Schema *
              </label>
              <select
                id="schema-select"
                value={existingSchemaId ?? ''}
                onChange={(event) =>
                  setExistingSchemaId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">Select a schema...</option>
                {schemas.map((schema) => (
                  <option key={schema.id} value={schema.id.toString()}>
                    {schema.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.length > 0 && (
                <div>
                  <label htmlFor="schema-template" className="block text-sm font-medium text-gray-700">
                    Start from Template (Optional)
                  </label>
                  <select
                    id="schema-template"
                    value={selectedTemplateId}
                    onChange={(event) => handleTemplateSelect(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    <option value="">Blank schema</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id.toString()}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="schema-name" className="block text-sm font-medium text-gray-700">
                  Schema Name *
                </label>
                <input
                  id="schema-name"
                  type="text"
                  value={schemaDraft.name}
                  onChange={(event) =>
                    setSchemaDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="schema-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  id="schema-description"
                  type="text"
                  value={schemaDraft.description}
                  onChange={(event) =>
                    setSchemaDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <ExtractionStrategySelector
                value={schemaDraft.extractionStrategy}
                onChange={(value) =>
                  setSchemaDraft((prev) => ({
                    ...prev,
                    extractionStrategy: value,
                  }))
                }
                showCostEstimate={false}
              />

              <div>
                <div className="block text-sm font-medium text-gray-700">
                  JSON Schema
                </div>
                <div className="mt-2 rounded-md border border-gray-200 p-3">
                  <SchemaVisualBuilder
                    schema={schemaDraft.jsonSchema}
                    onChange={(nextSchema) =>
                      setSchemaDraft((prev) => ({
                        ...prev,
                        jsonSchema: nextSchema,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label htmlFor="required-fields" className="block text-sm font-medium text-gray-700">
                  Required Fields
                </label>
                <textarea
                  id="required-fields"
                  value={schemaDraft.requiredFields}
                  onChange={(event) =>
                    setSchemaDraft((prev) => ({
                      ...prev,
                      requiredFields: event.target.value,
                    }))
                  }
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="department.code&#10;invoice.po_no&#10;items"
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step === 3 && strategy === 'prompt') {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="prompt-description" className="block text-sm font-medium text-gray-700">
              Describe your extraction needs *
            </label>
            <textarea
              id="prompt-description"
              value={promptDescription}
              onChange={(event) => setPromptDescription(event.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="Example: Extract invoice number, PO number, totals, and line items."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOptimizePrompt}
              disabled={isOptimizing}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {isOptimizing ? 'Optimizing...' : 'Generate Prompt'}
            </button>
          </div>
          <div>
            <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-700">
              Optimized Prompt *
            </label>
            <textarea
              id="prompt-text"
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              rows={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="Generated prompt will appear here..."
            />
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-4">
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
              <option value="">No OCR model</option>
              {ocrModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.isActive ? '' : '(Inactive)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="llm-model" className="block text-sm font-medium text-gray-700">
              LLM Model
            </label>
            <select
              id="llm-model"
              value={llmModelId}
              onChange={(event) => setLlmModelId(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option value="">No LLM model</option>
              {llmModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.isActive ? '' : '(Inactive)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-sm text-gray-700">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Project</div>
          <div className="mt-1">{name}</div>
          {description && <div className="mt-1 text-gray-500">{description}</div>}
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Strategy</div>
          <div className="mt-1 capitalize">{strategy ?? 'Not selected'}</div>
          {strategy === 'schema' && schemaMode === 'existing' && existingSchemaId && (
            <div className="mt-1 text-gray-500">Using existing schema ID {existingSchemaId}</div>
          )}
          {strategy === 'schema' && schemaMode === 'new' && (
            <div className="mt-1 text-gray-500">New schema: {schemaDraft.name}</div>
          )}
          {strategy === 'prompt' && (
            <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
              {promptText || 'No prompt generated.'}
            </div>
          )}
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="font-semibold">Models</div>
          <div className="mt-1 text-gray-500">
            OCR: {ocrModelId || 'None'}
          </div>
          <div className="text-gray-500">LLM: {llmModelId || 'None'}</div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Project"
      description="Set up extraction strategy, models, and defaults in a guided flow."
      maxWidthClassName="max-w-5xl"
      footer={
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
                onClick={handleCreate}
                disabled={isSubmitting}
                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex gap-2 text-xs font-medium text-gray-500">
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
      </div>
    </Dialog>
  );
}
