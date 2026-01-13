import { Project } from '@/lib/api/projects';

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
            className="ml-4 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          <span>{project._count?.groups ?? 0} groups</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{project._count?.manifests ?? 0} manifests</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </span>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete project "${project.name}"? This will delete all groups and manifests.`)) {
                onDelete(project.id);
              }
            }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
