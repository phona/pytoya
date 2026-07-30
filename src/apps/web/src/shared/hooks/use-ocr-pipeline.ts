import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { schemasApi } from '@/api/schemas';
import { extractorsApi } from '@/api/extractors';
import { apiClient } from '@/api/client';

export interface OcrPipelineEntry {
  extractorId: string;
  config: Record<string, unknown>;
}

export interface ExtractorTypeInfo {
  type: string;
  configSchema: Record<string, unknown>;
  promptContribution: string;
}

export function useOcrPipeline(schemaId: number) {
  const queryClient = useQueryClient();
  const [draftPipeline, setDraftPipeline] = useState<OcrPipelineEntry[] | null>(null);

  // Load schema for current ocrExtractors
  const { data: schema, isLoading: schemaLoading } = useQuery({
    queryKey: ['schema', schemaId],
    queryFn: () => schemasApi.getSchema(schemaId),
    enabled: !!schemaId,
  });

  // Load extractor instances for display names + add dialog
  const { data: instances = [], isLoading: instancesLoading } = useQuery({
    queryKey: ['extractors'],
    queryFn: () => extractorsApi.listExtractors({ isActive: true }),
  });

  // Load extractor types for configSchema lookup
  const { data: typeInfos = [] } = useQuery({
    queryKey: ['extractor-types'],
    queryFn: async () => {
      const res = await apiClient.get<ExtractorTypeInfo[]>('/extractor-types');
      return res.data;
    },
  });

  const savedPipeline = useMemo(() => {
    const raw = (schema?.validationSettings as any)?.ocrExtractors as OcrPipelineEntry[] | undefined;
    return raw ?? [];
  }, [schema?.validationSettings]);

  const pipeline = draftPipeline ?? savedPipeline;
  const isDirty = draftPipeline !== null;

  const extractorTypeMap = useMemo(() => {
    const map = new Map<string, ExtractorTypeInfo>();
    for (const info of typeInfos) map.set(info.type, info);
    return map;
  }, [typeInfos]);

  const instanceMap = useMemo(() => {
    const map = new Map<string, typeof instances[0]>();
    for (const inst of instances) map.set(inst.id, inst);
    return map;
  }, [instances]);

  const add = useCallback((entry: OcrPipelineEntry) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      return [...base, entry];
    });
  }, [savedPipeline]);

  const update = useCallback((index: number, config: Record<string, unknown>) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      const next = [...base];
      next[index] = { ...next[index], config };
      return next;
    });
  }, [savedPipeline]);

  const remove = useCallback((index: number) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      return base.filter((_, i) => i !== index);
    });
  }, [savedPipeline]);

  const move = useCallback((fromIndex: number, toIndex: number) => {
    setDraftPipeline((prev) => {
      const base = prev ?? savedPipeline;
      const next = [...base];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, [savedPipeline]);

  const saveMutation = useMutation({
    mutationFn: async (pipelineData: OcrPipelineEntry[]) => {
      const nextValidationSettings = {
        ...(schema?.validationSettings ?? {}),
        ocrExtractors: pipelineData,
      };
      await schemasApi.updateSchema(schemaId, { validationSettings: nextValidationSettings });
    },
    onMutate: () => {
      const previous = queryClient.getQueryData(['schema', schemaId]);
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['schema', schemaId], context.previous);
      }
    },
    onSuccess: () => {
      setDraftPipeline(null);
      queryClient.invalidateQueries({ queryKey: ['schema', schemaId] });
    },
  });

  const save = useCallback(() => {
    if (!draftPipeline) return;
    saveMutation.mutate(draftPipeline);
  }, [draftPipeline, saveMutation]);

  return {
    pipeline,
    savedPipeline,
    isDirty,
    extractorInstances: instances,
    instanceMap,
    extractorTypeMap,
    add,
    update,
    remove,
    move,
    save,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    isLoading: schemaLoading || instancesLoading,
  };
}
