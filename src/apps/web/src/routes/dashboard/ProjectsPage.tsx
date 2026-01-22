import { useState } from 'react';
import { FolderPlus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorText } from '@/api/client';
import { useProjects } from '@/shared/hooks/use-projects';
import { EmptyState } from '@/shared/components/EmptyState';
import { ProjectCard } from '@/shared/components/ProjectCard';
import { ProjectForm } from '@/shared/components/ProjectForm';
import { ProjectWizard } from '@/shared/components/ProjectWizard';
import { GuidedSetupWizard } from '@/shared/components/GuidedSetupWizard';
import { Project, UpdateProjectDto, CreateProjectDto } from '@/api/projects';
import { useI18n } from '@/shared/providers/I18nProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    projects,
    isLoading,
    error,
    updateProject,
    deleteProject,
    isUpdating,
  } = useProjects();

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isGuidedSetupOpen, setIsGuidedSetupOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleUpdate = async (data: UpdateProjectDto) => {
    if (editingProject) {
      await updateProject({ id: editingProject.id, data });
      setEditingProject(null);
      setIsEditOpen(false);
    }
  };

  // Unified handler for form - accepts union type and routes appropriately
  const handleFormSubmit = async (data: CreateProjectDto | UpdateProjectDto) => {
    if (editingProject) {
      await handleUpdate(data as UpdateProjectDto);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteProject(id);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('projects.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('projects.count', {
                count: projects.length,
                plural: projects.length === 1 ? '' : 's',
              })}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button">{t('projects.new')}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('projects.startWith')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setIsQuickCreateOpen(true);
                  setEditingProject(null);
                }}
              >
                {t('projects.quickCreate')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsGuidedSetupOpen(true);
                  setEditingProject(null);
                }}
              >
                {t('projects.guidedSetup')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ProjectWizard
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          onCreated={(projectId) => navigate(`/projects/${projectId}`)}
        />
        <GuidedSetupWizard
          isOpen={isGuidedSetupOpen}
          onClose={() => setIsGuidedSetupOpen(false)}
          onCreated={(projectId) => navigate(`/projects/${projectId}`)}
        />

        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setEditingProject(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingProject
                  ? t('projects.editNamed', { name: editingProject.name })
                  : t('projects.edit')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t('projects.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <ProjectForm
              project={editingProject ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsEditOpen(false);
                setEditingProject(null);
              }}
              isLoading={isUpdating}
            />
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-6 h-4 w-24" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-sm text-destructive">
            <div className="font-semibold">{t('projects.loadErrorTitle')}</div>
            <p className="mt-1">{getApiErrorText(error, t)}</p>
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title={t('projects.empty.title')}
            description={t('projects.empty.description')}
            icon={FolderPlus}
            className="py-12"
            action={{
              label: t('projects.new'),
              onClick: () => setIsQuickCreateOpen(true),
              icon: <Plus className="h-5 w-5" />,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (event.defaultPrevented) return;
                  navigate(`/projects/${project.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.defaultPrevented) return;
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/projects/${project.id}`);
                  }
                }}
              >
                <ProjectCard
                  project={project}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




