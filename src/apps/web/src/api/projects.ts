import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import type {
  CreateGroupDto,
  CreateProjectDto,
  GroupResponseDto,
  ProjectResponseDto,
  UpdateGroupDto,
  UpdateProjectDto,
} from '@pytoya/shared/types/projects';

export type Project = Jsonify<ProjectResponseDto> & {
  _count?: {
    groups?: number;
    manifests?: number;
  };
};

export type Group = Jsonify<GroupResponseDto> & {
  _count?: {
    manifests?: number;
  };
  statusCounts?: {
    pending?: number;
    failed?: number;
    verified?: number;
  };
};

export type {
  CreateProjectDto,
  UpdateProjectDto,
  CreateGroupDto,
  UpdateGroupDto,
};

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




