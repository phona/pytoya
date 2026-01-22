import { format } from 'date-fns';
import { FileText, Folder } from 'lucide-react';
import { useState } from 'react';
import { Project } from '@/api/projects';
import { getApiErrorText } from '@/api/client';
import { Button } from '@/shared/components/ui/button';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: number) => void | Promise<void>;
  onEdit?: (project: Project) => void;
}

export function ProjectCard({ project, onDelete, onEdit }: ProjectCardProps) {
  const { t } = useI18n();
  const { confirm, alert, ModalDialog } = useModalDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        {onEdit && (
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(project);
            }}
            aria-label={`Edit project ${project.name}`}
            variant="ghost"
            size="sm"
            className="ml-2 text-primary hover:text-primary"
          >
            {t('common.edit')}
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Folder className="h-4 w-4" aria-hidden="true" />
          <span>{project._count?.groups ?? 0} groups</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>{project._count?.manifests ?? 0} manifests</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Text Extractor</span>
          <span>{project.textExtractorId ? project.textExtractorId : 'Not set'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">LLM Model</span>
          <span>{project.llmModelId ? project.llmModelId : 'Not set'}</span>
        </div>
        {(!project.textExtractorId || !project.llmModelId) && (
          <div className="rounded-md border border-border bg-[color:var(--status-warning-bg)] px-2 py-1 text-[color:var(--status-warning-text)]">
            Extractor or LLM not configured
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Created {format(new Date(project.createdAt), 'PP')}
        </span>
        {onDelete && (
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void (async () => {
                const confirmed = await confirm({
                  title: t('project.detail.deleteTitle'),
                  message: t('project.detail.deleteMessage', { name: project.name }),
                  confirmText: t('common.delete'),
                  cancelText: t('common.cancel'),
                  destructive: true,
                });
                if (!confirmed) return;
                setIsDeleting(true);
                try {
                  await onDelete(project.id);
                } catch (error) {
                  void alert({
                    title: t('common.deleteFailedTitle'),
                    message: getApiErrorText(error, t),
                  });
                } finally {
                  setIsDeleting(false);
                }
              })();
            }}
            aria-label={`Delete project ${project.name}`}
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            aria-busy={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {t('common.delete')}
          </Button>
        )}
      </div>

      <ModalDialog />
    </div>
  );
}




