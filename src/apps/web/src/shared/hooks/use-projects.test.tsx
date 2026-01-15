import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, type Mock } from 'vitest';
import { projectsApi } from '@/api/projects';
import { useProjects } from './use-projects';

vi.mock('@/api/projects', () => ({
  projectsApi: {
    listProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProjects query', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Test Project',
          description: 'Test project description',
          userId: 1,
          defaultProviderId: null,
          defaultPromptId: null,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
          _count: {
            groups: 2,
            manifests: 5,
          },
        },
      ];

      (projectsApi.listProjects as Mock).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.projects).toEqual(mockProjects);
      expect(projectsApi.listProjects).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      (projectsApi.listProjects as Mock).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('createProject mutation', () => {
    it('should create a new project', async () => {
      const newProject = {
        id: 2,
        name: 'New Project',
        description: 'New description',
        userId: 1,
        defaultProviderId: null,
        defaultPromptId: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
        _count: { groups: 0, manifests: 0 },
      };

      (projectsApi.createProject as Mock).mockResolvedValue(newProject);
      (projectsApi.listProjects as Mock).mockResolvedValue([newProject]);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await result.current.createProject({
        name: 'New Project',
        description: 'New description',
      });

      expect(projectsApi.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'New description',
      });
    });
  });

  describe('updateProject mutation', () => {
    it('should update an existing project', async () => {
      const updatedProject = {
        id: 1,
        name: 'Updated Project',
        description: 'Updated description',
        userId: 1,
        defaultProviderId: null,
        defaultPromptId: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
        _count: { groups: 0, manifests: 0 },
      };

      (projectsApi.updateProject as Mock).mockResolvedValue(updatedProject);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await result.current.updateProject({
        id: 1,
        data: { name: 'Updated Project' },
      });

      expect(projectsApi.updateProject).toHaveBeenCalledWith(1, { name: 'Updated Project' });
    });
  });

  describe('deleteProject mutation', () => {
    it('should delete a project', async () => {
      (projectsApi.deleteProject as Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await result.current.deleteProject(1);

      expect(projectsApi.deleteProject).toHaveBeenCalledWith(1);
    });
  });
});
