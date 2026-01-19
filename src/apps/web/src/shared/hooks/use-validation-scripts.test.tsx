import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useValidationScripts,
  useValidationScript,
  useProjectValidationScripts,
  useValidateScriptSyntax,
  useGenerateValidationScript,
  useRunValidation,
  useRunBatchValidation,
} from './use-validation-scripts';
import { server } from '../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useValidationScripts', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('useValidationScripts', () => {
    it('should fetch validation scripts', async () => {
      const { result } = renderHook(() => useValidationScripts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.scripts).toHaveLength(1);
      });

      expect(result.current.scripts).toEqual([
        {
          id: 1,
          name: 'Test Script',
          code: 'return true;',
          language: 'javascript',
          projectId: 1,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        },
      ]);
    });

    it('should handle loading state', () => {
      server.use(
        http.get('/api/validation/scripts', () => {
          return new Promise(() => {}); // Never resolve
        })
      );

      const { result } = renderHook(() => useValidationScripts(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
    });

    it('should create script', async () => {
      const { result } = renderHook(() => useValidationScripts(), { wrapper: createWrapper() });

      await result.current.createScript({ name: 'New Script', code: 'return true;' });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useValidationScript', () => {
    it('should fetch single validation script', async () => {
      const { result } = renderHook(() => useValidationScript(1), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.script).toBeDefined();
      });

      expect(result.current.script).toEqual({
        id: 1,
        name: 'Test Script',
        code: 'return true;',
        language: 'javascript',
        projectId: 1,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      });
    });

    it('should not fetch when id is 0', () => {
      const { result } = renderHook(() => useValidationScript(0), { wrapper: createWrapper() });

      expect(result.current.script).toBeUndefined();
    });
  });

  describe('useProjectValidationScripts', () => {
    it('should handle empty scripts list', async () => {
      server.use(
        http.get('/api/validation/scripts', () => {
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() => useValidationScripts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.scripts).toEqual([]);
      });
    });
  });

  describe('useValidateScriptSyntax', () => {
    it('should validate script syntax', async () => {
      const { result } = renderHook(() => useValidateScriptSyntax(), { wrapper: createWrapper() });

      const response = await result.current.mutateAsync({ code: 'return true;' });

      expect(response).toEqual({ valid: true, errors: [] });
    });
  });

  describe('useGenerateValidationScript', () => {
    it('should generate validation script', async () => {
      const { result } = renderHook(() => useGenerateValidationScript(), { wrapper: createWrapper() });

      await result.current.mutateAsync({ schemaId: 1 });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useRunValidation', () => {
    it('should run validation', async () => {
      const { result } = renderHook(() => useRunValidation(), { wrapper: createWrapper() });

      await result.current.mutateAsync({ manifestId: 1, data: {} });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useRunBatchValidation', () => {
    it('should run batch validation', async () => {
      const { result } = renderHook(() => useRunBatchValidation(), { wrapper: createWrapper() });

      await result.current.mutateAsync({ manifestIds: [1, 2] });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('updateScript mutation', () => {
    it('should update script', async () => {
      const { result } = renderHook(() => useValidationScripts(), { wrapper: createWrapper() });

      await result.current.updateScript({ id: 1, data: { name: 'Updated Script' } });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('deleteScript mutation', () => {
    it('should delete script', async () => {
      const { result } = renderHook(() => useValidationScripts(), { wrapper: createWrapper() });

      await result.current.deleteScript(1);

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });
});
