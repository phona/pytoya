import { useState, useEffect } from 'react';
import {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidationScript,
  ValidationSeverity,
} from '@/lib/api/validation';
import { useProjects } from '@/hooks/use-projects';
import { useValidateScriptSyntax } from '@/hooks/use-validation-scripts';

interface ValidationScriptFormProps {
  script?: ValidationScript;
  templates?: ValidationScript[];
  onSubmit: (data: CreateValidationScriptDto | UpdateValidationScriptDto) => Promise<void>;
  onCancel: () => void;
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
  templates = [],
  onSubmit,
  onCancel,
  isLoading,
}: ValidationScriptFormProps) {
  const { projects } = useProjects();
  const validateSyntax = useValidateScriptSyntax();

  const [name, setName] = useState(script?.name ?? '');
  const [description, setDescription] = useState(script?.description ?? '');
  const [projectId, setProjectId] = useState(script?.projectId?.toString() ?? '');
  const [scriptCode, setScriptCode] = useState(script?.script ?? DEFAULT_SCRIPT);
  const [severity, setSeverity] = useState<ValidationSeverity>(script?.severity ?? 'warning');
  const [enabled, setEnabled] = useState(script?.enabled ?? true);
  const [selectedTemplate, setScriptSelectedTemplate] = useState<string>('');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isCheckingSyntax, setIsCheckingSyntax] = useState(false);

  useEffect(() => {
    if (script?.projectId) {
      setProjectId(script.projectId.toString());
    }
  }, [script?.projectId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id.toString() === templateId);
    if (template) {
      setScriptCode(template.script);
      setSeverity(template.severity);
      setDescription(template.description ?? '');
      setScriptSelectedTemplate(templateId);
      setSyntaxError(null);
    }
  };

  const handleScriptChange = (value: string) => {
    setScriptCode(value);
    setSyntaxError(null);
  };

  const handleCheckSyntax = async () => {
    setIsCheckingSyntax(true);
    try {
      const result = await validateSyntax.mutateAsync({ script: scriptCode });
      if (result.valid) {
        setSyntaxError(null);
        alert('Syntax is valid!');
      } else {
        setSyntaxError(result.error ?? 'Unknown syntax error');
      }
    } catch (error) {
      setSyntaxError(error instanceof Error ? error.message : 'Failed to validate syntax');
    } finally {
      setIsCheckingSyntax(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate project selection
    if (!projectId) {
      alert('Please select a project');
      return;
    }

    if (script) {
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
        projectId: parseInt(projectId, 10),
        severity: severity,
        enabled: enabled,
        description: description || undefined,
        isTemplate: false,
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Selection */}
      {!script && templates.length > 0 && (
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
            <option value="">Start with blank script...</option>
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
          Script Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Tax Calculation Check"
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
          disabled={!!script}
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

      <div>
        <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
          Default Severity
        </label>
        <select
          id="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as ValidationSeverity)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          The default severity level for issues found by this script.
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="script" className="block text-sm font-medium text-gray-700">
            Validation Script *
          </label>
          <button
            type="button"
            onClick={handleCheckSyntax}
            disabled={isCheckingSyntax}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingSyntax ? 'Checking...' : 'Check Syntax'}
          </button>
        </div>
        <textarea
          id="script"
          required
          value={scriptCode}
          onChange={(e) => handleScriptChange(e.target.value)}
          rows={20}
          className="mt-1 block w-full px-3 py-2 font-mono text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder={DEFAULT_SCRIPT}
        />
        {syntaxError && (
          <p className="mt-1 text-xs text-red-600">Syntax Error: {syntaxError}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The script must export a function named <code className="bg-gray-100 px-1 rounded">validate</code> that
          takes <code className="bg-gray-100 px-1 rounded">extractedData</code> and returns an array of validation
          issues.
        </p>
      </div>

      <div className="flex items-center">
        <input
          id="enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
          Enabled (this script will run automatically when validation is triggered)
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Script Function Signature</h4>
        <pre className="text-xs text-blue-800 overflow-x-auto">
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
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !!syntaxError}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : script ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
