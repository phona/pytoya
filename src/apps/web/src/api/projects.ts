import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import type {
  CreateGroupDto,
  CreateProjectDto,
  GroupResponseDto,
  ProjectResponseDto,
  ProjectCostSummaryDto,
  UpdateGroupDto,
  UpdateProjectDto,
  UpdateProjectExtractorDto,
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
export type ProjectCostSummary = Jsonify<ProjectCostSummaryDto>;

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

  updateProjectExtractor: async (id: number, data: UpdateProjectExtractorDto) => {
    const response = await apiClient.put<Project>(`/projects/${id}/extractor`, data);
    return response.data;
  },

  getProjectCostSummary: async (id: number, dateRange?: { from?: string; to?: string }) => {
    if (dateRange?.from || dateRange?.to) {
      const response = await apiClient.get<ProjectCostSummary>(
        `/projects/${id}/cost-by-date-range`,
        { params: dateRange },
      );
      return response.data;
    }
    const response = await apiClient.get<ProjectCostSummary>(`/projects/${id}/cost-summary`);
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

  getGroup: async (_projectId: number, groupId: number) => {
    const response = await apiClient.get<Group>(`/groups/${groupId}`);
    return response.data;
  },

  createGroup: async (projectId: number, data: CreateGroupDto) => {
    const response = await apiClient.post<Group>(`/projects/${projectId}/groups`, data);
    return response.data;
  },

  updateGroup: async (_projectId: number, groupId: number, data: UpdateGroupDto) => {
    const response = await apiClient.patch<Group>(`/groups/${groupId}`, data);
    return response.data;
  },

  deleteGroup: async (_projectId: number, groupId: number) => {
    await apiClient.delete(`/groups/${groupId}`);
  },
};




