import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, CreateProjectDto, UpdateProjectDto, CreateGroupDto, UpdateGroupDto } from '@/api/projects';

export function useProjects() {
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.listProjects,
  });

  const createProject = useMutation({
    mutationFn: (data: CreateProjectDto) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectDto }) =>
      projectsApi.updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: number) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    projects: projects.data ?? [],
    isLoading: projects.isLoading,
    error: projects.error,
    createProject: createProject.mutateAsync,
    updateProject: updateProject.mutateAsync,
    deleteProject: deleteProject.mutateAsync,
    isCreating: createProject.isPending,
    isUpdating: updateProject.isPending,
    isDeleting: deleteProject.isPending,
  };
}

export function useProject(id: number) {
  const project = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id,
  });

  return {
    project: project.data,
    isLoading: project.isLoading,
    error: project.error,
  };
}

export function useGroups(projectId: number) {
  const queryClient = useQueryClient();

  const groups = useQuery({
    queryKey: ['groups', projectId],
    queryFn: () => projectsApi.listGroups(projectId),
    enabled: !!projectId,
  });

  const createGroup = useMutation({
    mutationFn: (data: CreateGroupDto) => projectsApi.createGroup(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: UpdateGroupDto }) =>
      projectsApi.updateGroup(projectId, groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', projectId] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: number) => projectsApi.deleteGroup(projectId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  return {
    groups: groups.data ?? [],
    isLoading: groups.isLoading,
    error: groups.error,
    createGroup: createGroup.mutateAsync,
    updateGroup: updateGroup.mutateAsync,
    deleteGroup: deleteGroup.mutateAsync,
    isCreating: createGroup.isPending,
    isUpdating: updateGroup.isPending,
    isDeleting: deleteGroup.isPending,
  };
}
