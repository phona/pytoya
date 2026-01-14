import apiClient from '@/lib/api-client';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  defaultSchemaId?: number | null;
  _count?: {
    groups?: number;
    manifests?: number;
  };
}

export interface Group {
  id: number;
  name: string;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    manifests?: number;
  };
}

export interface CreateProjectDto {
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  defaultSchemaId?: number | null;
}

export interface CreateGroupDto {
  name: string;
}

export interface UpdateGroupDto {
  name?: string;
}

export const projectsApi = {
  // Projects
  listProjects: async () => {
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },

  getProject: async (id: number) => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (data: CreateProjectDto) => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  updateProject: async (id: number, data: UpdateProjectDto) => {
    const response = await apiClient.patch<Project>(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id: number) => {
    await apiClient.delete(`/projects/${id}`);
  },

  // Groups
  listGroups: async (projectId: number) => {
    const response = await apiClient.get<Group[]>(`/projects/${projectId}/groups`);
    return response.data;
  },

  getGroup: async (projectId: number, groupId: number) => {
    const response = await apiClient.get<Group>(`/projects/${projectId}/groups/${groupId}`);
    return response.data;
  },

  createGroup: async (projectId: number, data: CreateGroupDto) => {
    const response = await apiClient.post<Group>(`/projects/${projectId}/groups`, data);
    return response.data;
  },

  updateGroup: async (projectId: number, groupId: number, data: UpdateGroupDto) => {
    const response = await apiClient.patch<Group>(`/projects/${projectId}/groups/${groupId}`, data);
    return response.data;
  },

  deleteGroup: async (projectId: number, groupId: number) => {
    await apiClient.delete(`/projects/${projectId}/groups/${groupId}`);
  },
};
