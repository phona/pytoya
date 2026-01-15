import { useState, useEffect } from 'react';
import { CreateSchemaDto, UpdateSchemaDto, Schema, ExtractionStrategy } from '@/api/schemas';
import { useProjects } from '@/shared/hooks/use-projects';
import { JSONSchemaEditor } from '@/shared/components/JSONSchemaEditor';
import { SchemaVisualBuilder } from '@/shared/components/SchemaVisualBuilder';
import { ExtractionStrategySelector } from '@/shared/components/ExtractionStrategySelector';

interface SchemaFormProps {
  schema?: Schema;
  templates?: Schema[];
  onSubmit: (data: CreateSchemaDto | UpdateSchemaDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SchemaForm({ schema, templates = [], onSubmit, onCancel, isLoading }: SchemaFormProps) {
  const { projects } = useProjects();
  const [name, setName] = useState(schema?.name ?? '');
  const [description, setDescription] = useState(schema?.description ?? '');
  const [projectId, setProjectId] = useState(schema?.projectId?.toString() ?? '');
  const [jsonSchema, setJsonSchema] = useState(
    schema?.jsonSchema ? JSON.stringify(schema.jsonSchema, null, 2) : JSON.stringify({
      type: 'object',
      properties: {},
      required: [],
    }, null, 2)
  );
  const [requiredFields, setRequiredFields] = useState(
    schema?.requiredFields?.join('\n') ?? ''
  );
  const [extractionStrategy, setExtractionStrategy] = useState<ExtractionStrategy | null>(
    schema?.extractionStrategy ?? null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('code');

  useEffect(() => {
    if (schema?.projectId) {
      setProjectId(schema.projectId.toString());
    }
  }, [schema?.projectId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id.toString() === templateId);
    if (template) {
      setJsonSchema(JSON.stringify(template.jsonSchema, null, 2));
      setRequiredFields(template.requiredFields.join('\n'));
      setSelectedTemplate(templateId);
    }
  };

  const handleJsonSchemaChange = (value: string) => {
    setJsonSchema(value);
    try {
      JSON.parse(value);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate JSON Schema
    let parsedJsonSchema: Record<string, unknown>;
    try {
      parsedJsonSchema = JSON.parse(jsonSchema);
    } catch {
      setJsonError('Invalid JSON Schema format');
      return;
    }

    const fieldsArray = requiredFields
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (schema) {
      const updateData: UpdateSchemaDto = {
        name: name || undefined,
        jsonSchema: parsedJsonSchema,
        requiredFields: fieldsArray,
        description: description || undefined,
        extractionStrategy: extractionStrategy || undefined,
      };
      await onSubmit(updateData);
    } else {
      const data: CreateSchemaDto = {
        name,
        jsonSchema: parsedJsonSchema,
        requiredFields: fieldsArray,
        projectId: parseInt(projectId, 10),
        description: description || undefined,
        isTemplate: false,
        extractionStrategy: extractionStrategy || undefined,
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Selection */}
      {!schema && templates.length > 0 && (
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700">
            Start from Template (Optional)
          </label>
          <select
            id="template"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Start with blank schema...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id.toString()}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Schema Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Invoice Schema"
        />
      </div>

      <div>
        <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
          Project *
        </label>
        <select
          id="projectId"
          required
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!!schema}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id.toString()}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Optional description..."
        />
      </div>

      <ExtractionStrategySelector
        value={extractionStrategy}
        onChange={setExtractionStrategy}
        showCostEstimate={true}
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="jsonSchema" className="block text-sm font-medium text-gray-700">
            JSON Schema *
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorMode('visual')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                editorMode === 'visual'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Visual Builder
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('code')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                editorMode === 'code'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Code Editor
            </button>
          </div>
        </div>

        {editorMode === 'visual' ? (
          <div className="mt-1">
            <SchemaVisualBuilder
              schema={JSON.parse(jsonSchema || '{"type":"object","properties":{},"required":[]}')}
              onChange={(newSchema) => {
                const newJsonSchema = JSON.stringify(newSchema, null, 2);
                setJsonSchema(newJsonSchema);
                try {
                  JSON.parse(newJsonSchema);
                  setJsonError(null);
                } catch {
                  setJsonError('Invalid JSON Schema');
                }
              }}
            />
            <p className="mt-2 text-xs text-gray-500">
              Use the visual builder to create and edit schema properties. Switch to code editor for advanced editing.
            </p>
          </div>
        ) : (
          <>
            <JSONSchemaEditor
              value={jsonSchema}
              onChange={handleJsonSchemaChange}
              onError={setJsonError}
              placeholder='{"type": "object", "properties": {...}, "required": [...]}'
              rows={15}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a valid JSON Schema. This defines the structure for data extraction.
            </p>
          </>
        )}
      </div>

      <div>
        <label htmlFor="requiredFields" className="block text-sm font-medium text-gray-700">
          Required Fields
        </label>
        <textarea
          id="requiredFields"
          value={requiredFields}
          onChange={(e) => setRequiredFields(e.target.value)}
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="department.code&#10;invoice.po_no&#10;items"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter required fields using dot notation (one per line). These fields must be present in the extracted data.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !!jsonError}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : schema ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
