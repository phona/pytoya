import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  validationApi,
  ValidationScript,
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidateScriptSyntaxDto,
  GenerateValidationScriptDto,
  RunValidationDto,
  BatchValidationDto,
  ValidationResult,
} from '@/lib/api/validation';

export function useValidationScripts() {
  const queryClient = useQueryClient();

  const scripts = useQuery({
    queryKey: ['validation-scripts'],
    queryFn: validationApi.listScripts,
  });

  const createScript = useMutation({
    mutationFn: (data: CreateValidationScriptDto) => validationApi.createScript(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-scripts'] });
    },
  });

  const updateScript = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateValidationScriptDto }) =>
      validationApi.updateScript(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['validation-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['validation-script', variables.id] });
    },
  });

  const deleteScript = useMutation({
    mutationFn: (id: number) => validationApi.deleteScript(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-scripts'] });
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

export function useValidationScript(id: number) {
  const script = useQuery({
    queryKey: ['validation-script', id],
    queryFn: () => validationApi.getScript(id),
    enabled: !!id,
  });

  return {
    script: script.data,
    isLoading: script.isLoading,
    error: script.error,
  };
}

export function useProjectValidationScripts(projectId: number) {
  const scripts = useQuery({
    queryKey: ['validation-scripts', 'project', projectId],
    queryFn: () => validationApi.getProjectScripts(projectId),
    enabled: !!projectId,
  });

  return {
    scripts: scripts.data ?? [],
    isLoading: scripts.isLoading,
    error: scripts.error,
  };
}

export function useValidateScriptSyntax() {
  return useMutation({
    mutationFn: (data: ValidateScriptSyntaxDto) => validationApi.validateScriptSyntax(data),
  });
}

export function useGenerateValidationScript() {
  return useMutation({
    mutationFn: (data: GenerateValidationScriptDto) => validationApi.generateScript(data),
  });
}

export function useRunValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RunValidationDto) => validationApi.runValidation(data),
    onSuccess: (_, variables) => {
      // Invalidate the manifest query to get updated validation results
      queryClient.invalidateQueries({ queryKey: ['manifest', variables.manifestId] });
    },
  });
}

export function useRunBatchValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchValidationDto) => validationApi.runBatchValidation(data),
    onSuccess: (_, variables) => {
      // Invalidate all manifest queries in the batch
      for (const manifestId of variables.manifestIds) {
        queryClient.invalidateQueries({ queryKey: ['manifest', manifestId] });
      }
    },
  });
}
