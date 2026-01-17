import { useState } from 'react';
import { FolderPlus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/client';
import { useProjects } from '@/shared/hooks/use-projects';
import { ProjectCard } from '@/shared/components/ProjectCard';
import { ProjectForm } from '@/shared/components/ProjectForm';
import { ProjectWizard } from '@/shared/components/ProjectWizard';
import { Project, UpdateProjectDto, CreateProjectDto } from '@/api/projects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function ProjectsPage() {
  const navigate = useNavigate();
  const {
    projects,
    isLoading,
    error,
    updateProject,
    deleteProject,
    isUpdating,
  } = useProjects();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-600">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <button
            onClick={() => {
              setIsWizardOpen(true);
              setEditingProject(null);
            }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            New Project
          </button>
        </div>

        <ProjectWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
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
                {editingProject ? `Edit ${editingProject.name}` : 'Edit Project'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Update the project name and description.
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
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-6 h-4 w-24" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            <div className="font-semibold">Unable to load projects</div>
            <p className="mt-1">{getApiErrorMessage(error, 'Please try again in a moment.')}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/projects/${project.id}`)}
                onKeyDown={(event) => {
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
