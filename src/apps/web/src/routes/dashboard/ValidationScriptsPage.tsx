import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Code2, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useValidationScripts } from '@/shared/hooks/use-validation-scripts';
import {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidationScript,
} from '@/api/validation';
import { ValidationScriptForm } from '@/shared/components/ValidationScriptForm';
import { Button } from '@/shared/components/ui/button';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';

export function ValidationScriptsPage() {
  const { confirm, ModalDialog } = useModalDialog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const projectId = Number(searchParams.get('projectId'));
  const projectLink = Number.isFinite(projectId) ? `/projects/${projectId}` : '/projects';

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
    const confirmed = await confirm({
      title: 'Delete validation script',
      message: 'Are you sure you want to delete this validation script?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteScript(id);
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
      projectId: script.projectId.toString(),
      severity: script.severity,
      enabled: script.enabled,
      description: script.description ?? undefined,
    };
    await createScript(duplicateData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => navigate(projectLink)}
          className="mb-4 inline-flex items-center gap-2 text-primary hover:text-primary text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </button>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Validation Scripts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingScript(null);
            }}
          >
            New Script
          </Button>
        </div>

        {(showForm || editingScript) && (
          <div className="mb-8 bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
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
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading validation scripts...</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12">
            <Code2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No validation scripts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create validation scripts to verify data integrity after extraction.
            </p>
            <div className="mt-6">
              <Button type="button" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-5 w-5" />
                New Script
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-foreground">{script.name}</h3>
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
                    <p className="text-sm text-muted-foreground mt-1">Project ID: {script.projectId}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(script)}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(script)}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(script.id)}
                      className="text-destructive hover:text-destructive text-sm font-medium"
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {script.description && (
                  <p className="text-sm text-muted-foreground mb-4">{script.description}</p>
                )}
                <div className="text-sm text-muted-foreground mb-4">
                  <p>Created: {format(new Date(script.createdAt), 'PP')}</p>
                  <p>Updated: {format(new Date(script.updatedAt), 'PP')}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => handleToggleEnabled(script)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      script.enabled
                        ? 'bg-muted text-foreground hover:bg-muted'
                        : 'bg-[color:var(--status-completed-bg)] text-[color:var(--status-completed-text)]'
                    }`}
                  >
                    {script.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    function validate()
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalDialog />
    </div>
  );
}




