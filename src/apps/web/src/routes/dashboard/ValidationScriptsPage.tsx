import { useState } from 'react';
import { useValidationScripts } from '@/shared/hooks/use-validation-scripts';
import {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidationScript,
} from '@/api/validation';
import { ValidationScriptForm } from '@/shared/components/ValidationScriptForm';

export function ValidationScriptsPage() {
  const {
    scripts,
    isLoading,
    createScript,
    updateScript,
    deleteScript,
    isCreating,
    isUpdating,
    isDeleting,
  } = useValidationScripts();

  const [showForm, setShowForm] = useState(false);
  const [editingScript, setEditingScript] = useState<ValidationScript | null>(null);

  const handleCreate = async (data: CreateValidationScriptDto) => {
    await createScript(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: UpdateValidationScriptDto) => {
    if (editingScript) {
      await updateScript({ id: editingScript.id, data });
      setEditingScript(null);
    }
  };

  const handleFormSubmit = async (data: CreateValidationScriptDto | UpdateValidationScriptDto) => {
    if (editingScript) {
      await handleUpdate(data as UpdateValidationScriptDto);
    } else {
      await handleCreate(data as CreateValidationScriptDto);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this validation script?')) {
      await deleteScript(id);
    }
  };

  const handleEdit = (script: ValidationScript) => {
    setEditingScript(script);
    setShowForm(false);
  };

  const handleToggleEnabled = async (script: ValidationScript) => {
    await updateScript({ id: script.id, data: { enabled: !script.enabled } });
  };

  const handleDuplicate = async (script: ValidationScript) => {
    const duplicateData: CreateValidationScriptDto = {
      name: `${script.name} (Copy)`,
      script: script.script,
      projectId: script.projectId,
      severity: script.severity,
      enabled: script.enabled,
      description: script.description ?? undefined,
    };
    await createScript(duplicateData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Validation Scripts</h1>
            <p className="mt-1 text-sm text-gray-600">
              {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingScript(null);
            }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            New Script
          </button>
        </div>

        {(showForm || editingScript) && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingScript ? 'Edit Validation Script' : 'Create New Validation Script'}
            </h2>
            <ValidationScriptForm
              script={editingScript ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingScript(null);
              }}
              isLoading={isCreating || isUpdating}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading validation scripts...</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No validation scripts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create validation scripts to verify data integrity after extraction.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Script
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900">{script.name}</h3>
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
                    <p className="text-sm text-gray-500 mt-1">Project ID: {script.projectId}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(script)}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(script)}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(script.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {script.description && (
                  <p className="text-sm text-gray-600 mb-4">{script.description}</p>
                )}
                <div className="text-sm text-gray-500 mb-4">
                  <p>Created: {new Date(script.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(script.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleToggleEnabled(script)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      script.enabled
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {script.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    function validate()
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
