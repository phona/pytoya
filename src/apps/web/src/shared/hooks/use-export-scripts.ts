import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateExportScriptDto,
  TestExportScriptDto,
  UpdateExportScriptDto,
  ValidateExportScriptSyntaxDto,
  exportScriptsApi,
} from '@/api/export-scripts';

export function useExportScripts() {
  const queryClient = useQueryClient();

  const scripts = useQuery({
    queryKey: ['export-scripts'],
    queryFn: exportScriptsApi.listScripts,
  });

  const createScript = useMutation({
    mutationFn: (data: CreateExportScriptDto) => exportScriptsApi.createScript(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-scripts'] });
    },
  });

  const updateScript = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateExportScriptDto }) => exportScriptsApi.updateScript(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['export-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['export-script', variables.id] });
    },
  });

  const deleteScript = useMutation({
    mutationFn: (id: number) => exportScriptsApi.deleteScript(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-scripts'] });
    },
  });

  return {
    scripts: scripts.data ?? [],
    isLoading: scripts.isLoading,
    error: scripts.error,
    createScript: createScript.mutateAsync,
    updateScript: updateScript.mutateAsync,
    deleteScript: deleteScript.mutateAsync,
    isCreating: createScript.isPending,
    isUpdating: updateScript.isPending,
    isDeleting: deleteScript.isPending,
  };
}

export function useProjectExportScripts(projectId: number) {
  const scripts = useQuery({
    queryKey: ['export-scripts', 'project', projectId],
    queryFn: () => exportScriptsApi.getProjectScripts(projectId),
    enabled: !!projectId,
  });

  return {
    scripts: scripts.data ?? [],
    isLoading: scripts.isLoading,
    error: scripts.error,
  };
}

export function useValidateExportScriptSyntax() {
  return useMutation({
    mutationFn: (data: ValidateExportScriptSyntaxDto) => exportScriptsApi.validateScriptSyntax(data),
  });
}

export function useTestExportScript() {
  return useMutation({
    mutationFn: (data: TestExportScriptDto) => exportScriptsApi.testScript(data),
  });
}

