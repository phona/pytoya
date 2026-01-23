import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiErrorText } from '@/api/client';
import { UpdateSchemaDto } from '@/api/schemas';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { SchemaForm } from '@/shared/components/SchemaForm';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useProjectSchemas, useSchema, useSchemas } from '@/shared/hooks/use-schemas';
import { canonicalizeJsonSchemaForDisplay } from '@/shared/utils/schema';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ProjectSettingsSchemaPage() {
  const { confirm, alert, ModalDialog } = useModalDialog();
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);

  const { schemas, isLoading: projectSchemasLoading } = useProjectSchemas(projectId);
  const schemaId = schemas[0]?.id ?? 0;
  const { schema, isLoading: schemaLoading } = useSchema(schemaId);
  const { updateSchema, deleteSchema, isUpdating, isDeleting } = useSchemas();
  const schemaRecord = schema;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogDirty, setEditDialogDirty] = useState(false);

  const handleUpdate = async (data: UpdateSchemaDto) => {
    try {
      await updateSchema({ id: schemaId, data });
      setEditDialogOpen(false);
      setEditDialogDirty(false);
    } catch (error) {
      void alert({
        title: t('schema.settings.updateFailedTitle'),
        message: getApiErrorText(error, t),
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: t('schema.settings.deleteTitle'),
      message: t('schema.settings.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteSchema(schemaId);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      void alert({
        title: t('schema.settings.deleteFailedTitle'),
        message: getApiErrorText(error, t),
      });
    }
  };

  const requestCloseEditDialog = async () => {
    if (isUpdating || isDeleting) return;
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
    setEditDialogDirty(false);
  };

  const isLoading = projectSchemasLoading || schemaLoading;

  return (
    <ProjectSettingsShell projectId={projectId} schemaIdOverride={schemaId || null} activeTab="schema">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      ) : !schemaId || !schemaRecord ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {t('schema.settings.notAvailable')}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{schemaRecord.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{`Project ID: ${schemaRecord.projectId}`}</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(true)} disabled={isUpdating || isDeleting}>
                {t('common.edit')}
              </Button>
              <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isUpdating || isDeleting}>
                {t('common.delete')}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('schema.settings.jsonSchemaTitle')}</h2>
              <pre className="bg-background p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(
                  canonicalizeJsonSchemaForDisplay(schemaRecord.jsonSchema as Record<string, unknown>),
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>

          <Dialog
            open={editDialogOpen}
            onOpenChange={(next) => {
              if (next) {
                setEditDialogOpen(true);
                setEditDialogDirty(false);
                return;
              }
              void requestCloseEditDialog();
            }}
          >
            <DialogSideContent>
              <DialogHeader>
                <DialogTitle>{t('schema.settings.editTitle')}</DialogTitle>
                <DialogDescription className="sr-only">{t('schema.settings.editTitle')}</DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <SchemaForm
                  schema={schemaRecord}
                  onSubmit={handleUpdate}
                  onCancel={() => void requestCloseEditDialog()}
                  onDirtyChange={setEditDialogDirty}
                  isLoading={isUpdating}
                />
              </div>
            </DialogSideContent>
          </Dialog>

          <ModalDialog />
        </>
      )}
    </ProjectSettingsShell>
  );
}
