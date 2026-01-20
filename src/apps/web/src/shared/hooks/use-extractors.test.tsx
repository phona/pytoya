import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExtractors, useExtractorMutations } from './use-extractors';
import { server } from '@/tests/mocks/server';

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

describe('use-extractors hooks', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('fetches extractors list', async () => {
    const { result } = renderHook(() => useExtractors(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.extractors.length).toBeGreaterThan(0);
    });
  });

  it('filters extractors by type', async () => {
    const { result } = renderHook(
      () => useExtractors({ extractorType: 'vision-llm' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.extractors.length).toBeGreaterThan(0);
    });

    expect(result.current.extractors.every((item) => item.extractorType === 'vision-llm')).toBe(true);
  });

  it('executes extractor mutations', async () => {
    const { result } = renderHook(() => useExtractorMutations(), { wrapper: createWrapper() });

    const created = await result.current.createExtractor({
      name: 'New Extractor',
      extractorType: 'vision-llm',
      config: {},
    } as any);
    expect(created.id).toBe('extractor-new');

    const updated = await result.current.updateExtractor({
      id: 'extractor-1',
      data: { name: 'Updated Extractor' },
    } as any);
    expect(updated.id).toBe('extractor-1');

    await result.current.testExtractor('extractor-1');
    await result.current.deleteExtractor('extractor-1');
  });
});
