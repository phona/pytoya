import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  schemasApi,
  Schema,
  CreateSchemaDto,
  UpdateSchemaDto,
  ValidateSchemaDto,
} from '@/lib/api/schemas';

export function useSchemas() {
  const queryClient = useQueryClient();

  const schemas = useQuery({
    queryKey: ['schemas'],
    queryFn: schemasApi.listSchemas,
  });

  const createSchema = useMutation({
    mutationFn: (data: CreateSchemaDto) => schemasApi.createSchema(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
    },
  });

  const updateSchema = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSchemaDto }) =>
      schemasApi.updateSchema(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
      queryClient.invalidateQueries({ queryKey: ['schema', variables.id] });
    },
  });

  const deleteSchema = useMutation({
    mutationFn: (id: number) => schemasApi.deleteSchema(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
    },
  });

  return {
    schemas: schemas.data ?? [],
    isLoading: schemas.isLoading,
    error: schemas.error,
    createSchema: createSchema.mutateAsync,
    updateSchema: updateSchema.mutateAsync,
    deleteSchema: deleteSchema.mutateAsync,
    isCreating: createSchema.isPending,
    isUpdating: updateSchema.isPending,
    isDeleting: deleteSchema.isPending,
  };
}

export function useSchema(id: number) {
  const schema = useQuery({
    queryKey: ['schema', id],
    queryFn: () => schemasApi.getSchema(id),
    enabled: !!id,
  });

  return {
    schema: schema.data,
    isLoading: schema.isLoading,
    error: schema.error,
  };
}

export function useProjectSchemas(projectId: number) {
  const schemas = useQuery({
    queryKey: ['schemas', 'project', projectId],
    queryFn: () => schemasApi.getProjectSchemas(projectId),
    enabled: !!projectId,
  });

  return {
    schemas: schemas.data ?? [],
    isLoading: schemas.isLoading,
    error: schemas.error,
  };
}

export function useSchemaTemplates() {
  const templates = useQuery({
    queryKey: ['schemas', 'templates'],
    queryFn: schemasApi.getTemplates,
  });

  return {
    templates: templates.data ?? [],
    isLoading: templates.isLoading,
    error: templates.error,
  };
}

export function useValidateSchema() {
  return useMutation({
    mutationFn: (data: ValidateSchemaDto) => schemasApi.validateSchema(data),
  });
}

export function useValidateWithRequired() {
  return useMutation({
    mutationFn: (data: ValidateSchemaDto) => schemasApi.validateWithRequired(data),
  });
}
