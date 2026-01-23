import { useState } from 'react';
import { format } from 'date-fns';
import { Code2, Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreateValidationScriptDto, UpdateValidationScriptDto, ValidationScript } from '@/api/validation';
import { ValidationScriptForm } from '@/shared/components/ValidationScriptForm';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useProjectValidationScripts, useValidationScripts } from '@/shared/hooks/use-validation-scripts';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ProjectSettingsValidationScriptsPage() {
  const queryClient = useQueryClient();
  const { confirm, ModalDialog } = useModalDialog();
  const { t } = useI18n();
  const params = useParams();
  const projectId = Number(params.id);

  const {
    scripts,
    isLoading,
  } = useProjectValidationScripts(projectId);

  const {
    createScript,
    updateScript,
    deleteScript,
    isCreating,
    isUpdating,
    isDeleting,
  } = useValidationScripts();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogDirty, setEditDialogDirty] = useState(false);
  const [editingScript, setEditingScript] = useState<ValidationScript | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['validation-scripts', 'project', projectId] });
  };

  const handleCreate = async (data: CreateValidationScriptDto) => {
    await createScript({ ...data, projectId: projectId.toString() });
    await refresh();
    setEditDialogOpen(false);
    setEditingScript(null);
    setEditDialogDirty(false);
  };

  const handleUpdate = async (data: UpdateValidationScriptDto) => {
    if (editingScript) {
      await updateScript({ id: editingScript.id, data });
      await refresh();
      setEditDialogOpen(false);
      setEditingScript(null);
      setEditDialogDirty(false);
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
      title: t('validationScripts.deleteTitle'),
      message: t('validationScripts.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    await deleteScript(id);
    await refresh();
  };

  const handleEdit = (script: ValidationScript) => {
    setEditingScript(script);
    setEditDialogOpen(true);
    setEditDialogDirty(false);
  };

  const handleToggleEnabled = async (script: ValidationScript) => {
    await updateScript({ id: script.id, data: { enabled: !script.enabled } });
    await refresh();
  };

  const handleDuplicate = async (script: ValidationScript) => {
    const duplicateData: CreateValidationScriptDto = {
      name: `${script.name} (Copy)`,
      script: script.script,
      projectId: projectId.toString(),
      severity: script.severity,
      enabled: script.enabled,
      description: script.description ?? undefined,
    };
    await createScript(duplicateData);
    await refresh();
  };

  const requestCloseDialog = async () => {
    if (isCreating || isUpdating || isDeleting) return;
    if (editDialogDirty) {
      const confirmed = await confirm({
        title: t('common.discardTitle'),
        message: t('common.discardMessage'),
        confirmText: t('common.discard'),
        cancelText: t('common.cancel'),
        destructive: true,
      });
      if (!confirmed) return;
    }
    setEditDialogOpen(false);
    setEditingScript(null);
    setEditDialogDirty(false);
  };

  return (
    <ProjectSettingsShell projectId={projectId} activeTab="scripts">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('validationScripts.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('validationScripts.countLine', { count: scripts.length, plural: scripts.length === 1 ? '' : 's' })}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingScript(null);
            setEditDialogOpen(true);
            setEditDialogDirty(false);
          }}
        >
          {t('validationScripts.new')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t('validationScripts.loading')}</p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-12">
          <Code2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">{t('validationScripts.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('validationScripts.emptyMessage')}
          </p>
          <div className="mt-6">
            <Button type="button" onClick={() => {
              setEditingScript(null);
              setEditDialogOpen(true);
              setEditDialogDirty(false);
            }}>
              <Plus className="mr-2 h-5 w-5" />
              {t('validationScripts.new')}
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
                        {t('validationScripts.disabledBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('validationScripts.projectIdLine', { id: script.projectId })}
                  </p>
                </div>
                <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(script)}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDuplicate(script)}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium"
                    >
                      {t('validationScripts.duplicate')}
                    </button>
                  <button
                    onClick={() => handleDelete(script.id)}
                    className="text-destructive hover:text-destructive text-sm font-medium"
                      disabled={isDeleting}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
                {script.description && (
                  <p className="text-sm text-muted-foreground mb-4">{script.description}</p>
                )}
                <div className="text-sm text-muted-foreground mb-4">
                  <p>{t('validationScripts.createdLine', { date: format(new Date(script.createdAt), 'PP') })}</p>
                  <p>{t('validationScripts.updatedLine', { date: format(new Date(script.updatedAt), 'PP') })}</p>
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
                    {script.enabled ? t('validationScripts.disable') : t('validationScripts.enable')}
                  </button>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {t('validationScripts.codeSampleValidateFunction')}
                  </code>
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog
        open={editDialogOpen}
        onOpenChange={(next) => {
          if (next) {
            setEditDialogOpen(true);
            setEditDialogDirty(false);
            return;
          }
          void requestCloseDialog();
        }}
      >
        <DialogSideContent>
          <DialogHeader>
            <DialogTitle>
              {editingScript ? t('validationScripts.editTitle') : t('validationScripts.createTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingScript ? t('validationScripts.editTitle') : t('validationScripts.createTitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ValidationScriptForm
              script={editingScript ?? undefined}
              fixedProjectId={projectId}
              showProjectField={false}
              onSubmit={handleFormSubmit}
              onCancel={() => void requestCloseDialog()}
              onDirtyChange={setEditDialogDirty}
              isLoading={isCreating || isUpdating}
            />
          </div>
        </DialogSideContent>
      </Dialog>

      <ModalDialog />
    </ProjectSettingsShell>
  );
}
