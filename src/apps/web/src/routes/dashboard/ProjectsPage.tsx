import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/client';
import { useProjects } from '@/shared/hooks/use-projects';
import { Dialog } from '@/shared/components/Dialog';
import { ProjectCard } from '@/shared/components/ProjectCard';
import { ProjectForm } from '@/shared/components/ProjectForm';
import { ProjectWizard } from '@/shared/components/ProjectWizard';
import { Project, UpdateProjectDto, CreateProjectDto } from '@/api/projects';

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
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingProject(null);
          }}
          title={editingProject ? `Edit ${editingProject.name}` : 'Edit Project'}
        >
          <ProjectForm
            project={editingProject ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsEditOpen(false);
              setEditingProject(null);
            }}
            isLoading={isUpdating}
          />
        </Dialog>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            <div className="font-semibold">Unable to load projects</div>
            <p className="mt-1">{getApiErrorMessage(error, 'Please try again in a moment.')}</p>
          </div>
        ) : projects.length === 0 ? (
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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
