import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  schemasApi,
  CreateSchemaDto,
  CreateSchemaRuleDto,
  GenerateRulesDto,
  GenerateSchemaDto,
  ImportSchemaDto,
  UpdateSchemaDto,
  UpdateSchemaRuleDto,
  ValidateSchemaDto,
} from '@/api/schemas';

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

export function useSchemaRules(schemaId: number) {
  const queryClient = useQueryClient();
  const rules = useQuery({
    queryKey: ['schemas', schemaId, 'rules'],
    queryFn: () => schemasApi.listSchemaRules(schemaId),
    enabled: !!schemaId,
  });

  const createRule = useMutation({
    mutationFn: (data: CreateSchemaRuleDto) => schemasApi.createSchemaRule(schemaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas', schemaId, 'rules'] });
    },
  });

  const updateRule = useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: number; data: UpdateSchemaRuleDto }) =>
      schemasApi.updateSchemaRule(schemaId, ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas', schemaId, 'rules'] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: number) => schemasApi.deleteSchemaRule(schemaId, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas', schemaId, 'rules'] });
    },
  });

  return {
    rules: rules.data ?? [],
    isLoading: rules.isLoading,
    error: rules.error,
    createRule: createRule.mutateAsync,
    updateRule: updateRule.mutateAsync,
    deleteRule: deleteRule.mutateAsync,
    isCreating: createRule.isPending,
    isUpdating: updateRule.isPending,
    isDeleting: deleteRule.isPending,
  };
}

export function useGenerateSchema() {
  return useMutation({
    mutationFn: (data: GenerateSchemaDto) => schemasApi.generateSchema(data),
  });
}

export function useGenerateRules(schemaId: number) {
  return useMutation({
    mutationFn: (data: GenerateRulesDto) => schemasApi.generateRules(schemaId, data),
  });
}

export function useImportSchema() {
  return useMutation({
    mutationFn: (data: ImportSchemaDto) => schemasApi.importSchema(data),
  });
}

export function useValidateSchemaDefinition() {
  return useMutation({
    mutationFn: (data: ValidateSchemaDto) => schemasApi.validateSchemaDefinition(data),
  });
}

export function useValidateWithRequired() {
  return useMutation({
    mutationFn: (data: ValidateSchemaDto) => schemasApi.validateWithRequired(data),
  });
}




