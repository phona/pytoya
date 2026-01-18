import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject, useGroups } from '@/shared/hooks/use-projects';
import { ArrowLeft, FileText, Folder, FolderOpen } from 'lucide-react';
import { GroupCard } from '@/shared/components/GroupCard';
import { GroupForm } from '@/shared/components/GroupForm';
import { ExportButton } from '@/shared/components/ExportButton';
import { ProjectWizard } from '@/shared/components/ProjectWizard';
import { Group, CreateGroupDto, UpdateGroupDto } from '@/api/projects';

export function ProjectDetailPage() {
  const navigate = useNavigate();
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
  } = useGroups(projectId);

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

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
            onClick={() => navigate('/projects')}
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
            onClick={() => navigate('/projects')}
            className="text-sm text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-gray-600">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Project Settings
              </button>
              <ExportButton
                filters={{ projectId }}
                filename={`${project.name.replace(/\s+/g, '-')}-export.csv`}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Folder className="h-4 w-4" />
              <span>{project._count?.groups ?? 0} groups</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
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
                projectId={projectId}
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
              <FolderOpen className="mx-auto h-10 w-10 text-gray-400" />
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

        </div>
      </div>

      <ProjectWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        mode="edit"
        projectId={projectId}
      />
    </div>
  );
}
