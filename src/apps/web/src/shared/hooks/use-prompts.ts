import { useQuery } from '@tanstack/react-query';
import { promptsApi } from '@/api/prompts';

export function usePrompts() {
  const prompts = useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.listPrompts,
  });

  return {
    prompts: prompts.data ?? [],
    isLoading: prompts.isLoading,
    error: prompts.error,
  };
}
