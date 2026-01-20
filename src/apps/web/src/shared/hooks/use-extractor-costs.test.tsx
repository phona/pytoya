import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExtractorCostSummary, useProjectCostSummary } from './use-extractor-costs';
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

describe('use-extractor-costs hooks', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('fetches extractor cost summary', async () => {
    const { result } = renderHook(() => useExtractorCostSummary('extractor-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    expect(result.current.summary?.extractorId).toBe('extractor-1');
  });

  it('fetches project cost summary', async () => {
    const { result } = renderHook(() => useProjectCostSummary(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    expect(result.current.summary?.totalExtractionCost).toBe(0.25);
  });

  it('fetches project cost summary with date range', async () => {
    const { result } = renderHook(
      () => useProjectCostSummary(1, { from: '2025-01-01', to: '2025-01-13' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.summary?.dateRange).toBeDefined();
    });

    expect(result.current.summary?.dateRange?.from).toBe('2025-01-01');
  });
});
