import { Group } from '@/lib/api/projects';

interface GroupCardProps {
  group: Group;
  onDelete?: (id: number) => void;
  onEdit?: (group: Group) => void;
}

export function GroupCard({ group, onDelete, onEdit }: GroupCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h4 className="text-md font-medium text-gray-900">{group.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(group)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{group._count?.manifests ?? 0} manifests</span>
        </div>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete group "${group.name}"? This will delete all manifests.`)) {
                onDelete(group.id);
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
