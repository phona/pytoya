import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Folder, FolderOpen } from 'lucide-react';
import { useGroups, useProject, useProjects } from '@/shared/hooks/use-projects';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import { GroupCard } from '@/shared/components/GroupCard';
import { GroupForm } from '@/shared/components/GroupForm';
import { ExportButton } from '@/shared/components/ExportButton';
import { SettingsDropdown } from '@/shared/components/SettingsDropdown';
import { EmptyState } from '@/shared/components/EmptyState';
import { Button } from '@/shared/components/ui/button';
import { Group, CreateGroupDto, UpdateGroupDto } from '@/api/projects';
import { getApiErrorText } from '@/api/client';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { useI18n } from '@/shared/providers/I18nProvider';

export function ProjectDetailPage() {
  const { t } = useI18n();
  const { confirm, alert, ModalDialog } = useModalDialog();
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
  const { schemas: projectSchemas } = useProjectSchemas(projectId);
  const { deleteProject, isDeleting: isProjectDeleting } = useProjects();

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

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

  const handleDeleteProject = async () => {
    if (!project) return;
    if (isProjectDeleting) return;
    const confirmed = await confirm({
      title: t('project.detail.deleteTitle'),
      message: t('project.detail.deleteMessage', { name: project.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteProject(project.id);
      navigate('/projects');
    } catch (error) {
      void alert({
        title: t('common.deleteFailedTitle'),
        message: getApiErrorText(error, t),
      });
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-foreground">{t('project.detail.notFoundTitle')}</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mt-4"
          >
            {t('project.detail.backToProjects')}
          </Button>
        </div>
      </div>
    );
  }

  const projectSchema = projectSchemas[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <AppBreadcrumbs
            className="mb-4"
            items={[
              { label: t('nav.projects'), to: '/projects' },
              { label: project.name },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SettingsDropdown
                projectId={projectId}
                schemaId={projectSchema?.id}
                onDelete={handleDeleteProject}
              />
              <ExportButton
                filters={{ projectId }}
                filename={`${project.name.replace(/\s+/g, '-')}-export.csv`}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Folder className="h-4 w-4" />
              <span>
                {t('project.detail.groupsCount', {
                  count: project._count?.groups ?? 0,
                  plural: (project._count?.groups ?? 0) === 1 ? '' : 's',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>
                {t('project.detail.manifestsCount', {
                  count: project._count?.manifests ?? 0,
                  plural: (project._count?.manifests ?? 0) === 1 ? '' : 's',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-lg font-semibold text-foreground">{t('project.detail.groupsTitle')}</h2>
            <Button
              type="button"
              onClick={() => {
                setShowForm(true);
                setEditingGroup(null);
              }}
            >
              {t('project.detail.newGroup')}
            </Button>
          </div>

          {(showForm || editingGroup) && (
            <div className="mb-6 bg-background rounded-lg p-4">
              <h3 className="text-md font-medium text-foreground mb-3">
                {editingGroup ? t('project.detail.editGroup') : t('project.detail.createGroup')}
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
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              title={t('project.detail.noGroupsTitle')}
              description={t('project.detail.noGroupsDescription')}
              icon={FolderOpen}
              action={{
                label: t('project.detail.newGroup'),
                onClick: () => {
                  setShowForm(true);
                  setEditingGroup(null);
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onClick={() => navigate(`/projects/${projectId}/groups/${group.id}/manifests`)}
                  onEdit={handleEditGroup}
                  onDelete={handleDeleteGroup}
                />
              ))}
            </div>
          )}
        </div>

        <ModalDialog />
      </div>
    </div>
  );
}




