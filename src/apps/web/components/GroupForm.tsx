import { useState } from 'react';
import { CreateGroupDto, UpdateGroupDto, Group } from '@/lib/api/projects';

interface GroupFormProps {
  group?: Group;
  onSubmit: (data: CreateGroupDto | UpdateGroupDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GroupForm({ group, onSubmit, onCancel, isLoading }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (group) {
      const updateData: UpdateGroupDto = {};
      if (name) updateData.name = name;
      await onSubmit(updateData);
    } else {
      const data: CreateGroupDto = { name };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Group Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Group A"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : group ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
