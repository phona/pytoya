import { format } from 'date-fns';
import { FileText, Folder } from 'lucide-react';
import { Project } from '@/api/projects';
import { Button } from '@/shared/components/ui/button';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: number) => void;
  onEdit?: (project: Project) => void;
}

export function ProjectCard({ project, onDelete, onEdit }: ProjectCardProps) {
  const { confirm, ModalDialog } = useModalDialog();
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
            onClick={() => onEdit(project)}
            aria-label={`Edit project ${project.name}`}
            variant="ghost"
            size="sm"
            className="ml-2 text-primary hover:text-primary"
          >
            Edit
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
            onClick={() => {
              void (async () => {
                const confirmed = await confirm({
                  title: 'Delete project',
                  message: `Delete project "${project.name}"? This will delete all groups and manifests.`,
                  confirmText: 'Delete',
                  destructive: true,
                });
                if (!confirmed) return;
                onDelete(project.id);
              })();
            }}
            aria-label={`Delete project ${project.name}`}
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        )}
      </div>

      <ModalDialog />
    </div>
  );
}




