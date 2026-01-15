import { useState, useEffect } from 'react';
import {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidationScript,
  ValidationSeverity,
} from '@/lib/api/validation';
import { useProjects } from '@/hooks/use-projects';
import { useValidateScriptSyntax, useGenerateValidationScript } from '@/hooks/use-validation-scripts';
import { useProviders } from '@/hooks/use-providers';

interface ValidationScriptFormProps {
  script?: ValidationScript;
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
  onSubmit,
  onCancel,
  isLoading,
}: ValidationScriptFormProps) {
  const { projects } = useProjects();
  const { providers } = useProviders();
  const validateSyntax = useValidateScriptSyntax();
  const generateScript = useGenerateValidationScript();

  const [name, setName] = useState(script?.name ?? '');
  const [description, setDescription] = useState(script?.description ?? '');
  const [projectId, setProjectId] = useState(script?.projectId?.toString() ?? '');
  const [scriptCode, setScriptCode] = useState(script?.script ?? DEFAULT_SCRIPT);
  const [severity, setSeverity] = useState<ValidationSeverity>(script?.severity ?? 'warning');
  const [enabled, setEnabled] = useState(script?.enabled ?? true);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isCheckingSyntax, setIsCheckingSyntax] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [promptText, setPromptText] = useState('');
  const [structuredInput, setStructuredInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (script?.projectId) {
      setProjectId(script.projectId.toString());
    }
  }, [script?.projectId]);

  useEffect(() => {
    const defaultProvider = providers.find((provider) => provider.isDefault);
    if (defaultProvider && !providerId) {
      setProviderId(defaultProvider.id.toString());
    }
  }, [providers, providerId]);

  const handleScriptChange = (value: string) => {
    setScriptCode(value);
    setSyntaxError(null);
  };

  const handleGenerate = async () => {
    if (!providerId) {
      alert('Please select a provider');
      return;
    }

    if (!promptText.trim()) {
      alert('Please enter a prompt');
      return;
    }

    let structured: Record<string, unknown> = {};
    if (structuredInput.trim()) {
      try {
        structured = JSON.parse(structuredInput);
      } catch (error) {
        alert('Structured input must be valid JSON');
        return;
      }
    }

    const hasExisting =
      name.trim() || description.trim() || scriptCode.trim() !== DEFAULT_SCRIPT.trim();

    if (hasExisting) {
      const confirmed = confirm('Replace the current script with the generated result?');
      if (!confirmed) {
        return;
      }
    }

    setIsGenerating(true);
    try {
      const result = await generateScript.mutateAsync({
        providerId: Number(providerId),
        prompt: promptText.trim(),
        structured,
      });
      setName(result.name);
      setDescription(result.description ?? '');
      setSeverity(result.severity);
      setScriptCode(result.script);
      setSyntaxError(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate script');
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
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-md border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Generate with LLM</h3>
        <p className="mt-1 text-xs text-gray-500">
          Provide a structured JSON and a prompt to generate a validation script.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="providerId" className="block text-sm font-medium text-gray-700">
              Provider *
            </label>
            <select
              id="providerId"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Select a provider...</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id.toString()}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promptText" className="block text-sm font-medium text-gray-700">
              Prompt *
            </label>
            <input
              id="promptText"
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Describe the validation rule"
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="structuredInput" className="block text-sm font-medium text-gray-700">
            Structured JSON
          </label>
          <textarea
            id="structuredInput"
            value={structuredInput}
            onChange={(e) => setStructuredInput(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 font-mono text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder='{"taxRate":0.13,"requiredFields":["invoice.po_no"]}'
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Must be valid JSON if provided.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

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
