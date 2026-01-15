'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProject, useGroups, useProjects } from '@/hooks/use-projects';
import { useProjectSchemas } from '@/hooks/use-schemas';
import { GroupCard } from '@/components/GroupCard';
import { GroupForm } from '@/components/GroupForm';
import { ExportButton } from '@/components/ExportButton';
import { Group, CreateGroupDto, UpdateGroupDto } from '@/lib/api/projects';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const { project, isLoading: projectLoading } = useProject(projectId);
  const {
    groups,
    isLoading: groupsLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    isCreating,
    isUpdating,
    isDeleting,
  } = useGroups(projectId);
  const { schemas: projectSchemas } = useProjectSchemas(projectId);
  const { updateProject, isUpdating: isProjectUpdating } = useProjects();

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(null);

  const handleCreateGroup = async (data: CreateGroupDto) => {
    await createGroup(data);
    setShowForm(false);
  };

  const handleUpdateGroup = async (data: UpdateGroupDto) => {
    if (editingGroup) {
      await updateGroup({ groupId: editingGroup.id, data });
      setEditingGroup(null);
    }
  };

  // Unified handler for form - accepts union type and routes appropriately
  const handleFormSubmit = async (data: CreateGroupDto | UpdateGroupDto) => {
    if (editingGroup) {
      await handleUpdateGroup(data as UpdateGroupDto);
    } else {
      await handleCreateGroup(data as CreateGroupDto);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    await deleteGroup(groupId);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowForm(false);
  };

  const handleUpdateDefaultSchema = async () => {
    await updateProject({
      id: projectId,
      data: { defaultSchemaId: selectedSchemaId },
    });
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Project not found</h2>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/projects')}
            className="text-sm text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back to Projects
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-gray-600">{project.description}</p>
              )}
            </div>
            <ExportButton
              filters={{ projectId }}
              filename={`${project.name.replace(/\s+/g, '-')}-export.csv`}
            />
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
        </div>

        {/* Groups Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingGroup(null);
              }}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              New Group
            </button>
          </div>

          {(showForm || editingGroup) && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h3>
              <GroupForm
                group={editingGroup ?? undefined}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingGroup(null);
                }}
                isLoading={isCreating || isUpdating}
              />
            </div>
          )}

          {groupsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-indigo-600 border-r-transparent"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-10 w-10 text-gray-400"
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
              <p className="mt-1 text-sm text-gray-500">Create a group to organize your manifests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onEdit={handleEditGroup}
                  onDelete={handleDeleteGroup}
                />
              ))}
            </div>
          )}

          {/* Schema Settings Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Schema</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select the default JSON Schema to use for data extraction in this project.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="schema-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Schema
                </label>
                <select
                  id="schema-select"
                  value={selectedSchemaId ?? project?.defaultSchemaId ?? ''}
                  onChange={(e) => setSelectedSchemaId(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">No default schema</option>
                  {projectSchemas.map((schema) => (
                    <option key={schema.id} value={schema.id.toString()}>
                      {schema.name}
                      {schema.id === project?.defaultSchemaId && ' (Current)'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleUpdateDefaultSchema}
                disabled={isProjectUpdating || selectedSchemaId === project?.defaultSchemaId}
                className="mt-5 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProjectUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
            {projectSchemas.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                No schemas available.{' '}
                <button
                  onClick={() => window.location.href = '/schemas'}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create a schema
                </button>
                {' '}to enable data extraction.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
