import { format } from 'date-fns';
import { FileText, Folder } from 'lucide-react';
import { Project } from '@/api/projects';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: number) => void;
  onEdit?: (project: Project) => void;
}

export function ProjectCard({ project, onDelete, onEdit }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
          {project.description && (
            <p className="mt-1 text-sm text-gray-600">{project.description}</p>
          )}
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(project)}
            aria-label={`Edit project ${project.name}`}
            className="ml-4 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Folder className="h-4 w-4" aria-hidden="true" />
          <span>{project._count?.groups ?? 0} groups</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>{project._count?.manifests ?? 0} manifests</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">OCR Model</span>
          <span>{project.ocrModelId ? project.ocrModelId : 'Not set'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">LLM Model</span>
          <span>{project.llmModelId ? project.llmModelId : 'Not set'}</span>
        </div>
        {(!project.ocrModelId || !project.llmModelId) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
            Models not fully configured
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Created {format(new Date(project.createdAt), 'PP')}
        </span>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete project "${project.name}"? This will delete all groups and manifests.`)) {
                onDelete(project.id);
              }
            }}
            aria-label={`Delete project ${project.name}`}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
