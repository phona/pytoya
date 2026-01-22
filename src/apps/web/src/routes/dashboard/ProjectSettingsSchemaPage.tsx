import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiErrorText } from '@/api/client';
import { UpdateSchemaDto } from '@/api/schemas';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';
import { SchemaForm } from '@/shared/components/SchemaForm';
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

  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = async (data: UpdateSchemaDto) => {
    try {
      await updateSchema({ id: schemaId, data });
      setIsEditing(false);
    } catch (error) {
      void alert({
        title: 'Update schema failed',
        message: getApiErrorText(error, t),
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete schema',
      message: 'Are you sure you want to delete this schema?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteSchema(schemaId);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      void alert({
        title: 'Delete schema failed',
        message: getApiErrorText(error, t),
      });
    }
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
          Schema is not available yet. Run the first extraction to generate it.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{schemaRecord.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{`Project ID: ${schemaRecord.projectId}`}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                disabled={isUpdating || isDeleting}
                className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Schema'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isUpdating || isDeleting}
                className="px-4 py-2 border border-destructive/40 rounded-md shadow-sm text-sm font-medium text-destructive bg-card hover:bg-destructive/10"
              >
                Delete
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Edit Schema</h2>
              <SchemaForm
                schema={schemaRecord}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
                isLoading={isUpdating}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">JSON Schema</h2>
                <pre className="bg-background p-4 rounded-md overflow-x-auto text-xs">
                  {JSON.stringify(
                    canonicalizeJsonSchemaForDisplay(schemaRecord.jsonSchema as Record<string, unknown>),
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}

          <ModalDialog />
        </>
      )}
    </ProjectSettingsShell>
  );
}
