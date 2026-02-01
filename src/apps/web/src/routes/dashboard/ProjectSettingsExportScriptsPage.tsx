import { useState } from 'react';
import { format } from 'date-fns';
import { Code2, Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreateExportScriptDto, ExportScript, UpdateExportScriptDto } from '@/api/export-scripts';
import { ExportScriptForm } from '@/shared/components/ExportScriptForm';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useExportScripts, useProjectExportScripts } from '@/shared/hooks/use-export-scripts';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ProjectSettingsExportScriptsPage() {
  const queryClient = useQueryClient();
  const { confirm, ModalDialog } = useModalDialog();
  const { t } = useI18n();
  const params = useParams();
  const projectId = Number(params.id);

  const { scripts, isLoading } = useProjectExportScripts(projectId);
  const { createScript, updateScript, deleteScript, isCreating, isUpdating, isDeleting } = useExportScripts();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogDirty, setEditDialogDirty] = useState(false);
  const [editingScript, setEditingScript] = useState<ExportScript | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['export-scripts', 'project', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['export-scripts'] });
  };

  const handleCreate = async (data: CreateExportScriptDto) => {
    await createScript({ ...data, projectId: projectId.toString() });
    await refresh();
    setEditDialogOpen(false);
    setEditingScript(null);
    setEditDialogDirty(false);
  };

  const handleUpdate = async (data: UpdateExportScriptDto) => {
    if (editingScript) {
      await updateScript({ id: editingScript.id, data });
      await refresh();
      setEditDialogOpen(false);
      setEditingScript(null);
      setEditDialogDirty(false);
    }
  };

  const handleFormSubmit = async (data: CreateExportScriptDto | UpdateExportScriptDto) => {
    if (editingScript) {
      await handleUpdate(data as UpdateExportScriptDto);
    } else {
      await handleCreate(data as CreateExportScriptDto);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: t('exportScripts.deleteTitle'),
      message: t('exportScripts.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    await deleteScript(id);
    await refresh();
  };

  const handleEdit = (script: ExportScript) => {
    setEditingScript(script);
    setEditDialogOpen(true);
    setEditDialogDirty(false);
  };

  const handleToggleEnabled = async (script: ExportScript) => {
    await updateScript({ id: script.id, data: { enabled: !script.enabled } });
    await refresh();
  };

  const handleDuplicate = async (script: ExportScript) => {
    const duplicateData: CreateExportScriptDto = {
      name: `${script.name} (Copy)`,
      script: script.script,
      projectId: projectId.toString(),
      enabled: script.enabled,
      priority: script.priority,
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
    <ProjectSettingsShell projectId={projectId} activeTab="exportScripts">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('exportScripts.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('exportScripts.countLine', { count: scripts.length, plural: scripts.length === 1 ? '' : 's' })}
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
          {t('exportScripts.new')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t('exportScripts.loading')}</p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-12">
          <Code2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">{t('exportScripts.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('exportScripts.emptyMessage')}</p>
          <div className="mt-6">
            <Button
              type="button"
              onClick={() => {
                setEditingScript(null);
                setEditDialogOpen(true);
                setEditDialogDirty(false);
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('exportScripts.new')}
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
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground">
                      p{script.priority}
                    </span>
                    {!script.enabled && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground">
                        {t('exportScripts.disabledBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('exportScripts.projectIdLine', { id: script.projectId })}
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
                    {t('exportScripts.duplicate')}
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

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <p>{t('exportScripts.createdLine', { date: format(new Date(script.createdAt), 'PP') })}</p>
                  <p>{t('exportScripts.updatedLine', { date: format(new Date(script.updatedAt), 'PP') })}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleToggleEnabled(script)}
                  disabled={isUpdating}
                >
                  {script.enabled ? t('exportScripts.disable') : t('exportScripts.enable')}
                </Button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                {t('exportScripts.codeSampleExportRowsFunction')}
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
              {editingScript ? t('exportScripts.editTitle') : t('exportScripts.createTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingScript ? t('exportScripts.editTitle') : t('exportScripts.createTitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ExportScriptForm
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

