import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExtractConfirmationModal } from './ExtractConfirmationModal';
import { ExtractionProgressView } from './ExtractionProgressView';
import { ExtractionCostTracker } from './ExtractionCostTracker';
import { useExtractionStore } from '@/shared/stores/extraction';
import type { Model } from '@/api/models';

// Mock the store
vi.mock('@/shared/stores/extraction', () => ({
  useExtractionStore: vi.fn(),
}));

const mockUseExtractionStore = vi.mocked(useExtractionStore);

describe('Extraction Flow Integration Tests', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockModels: Model[] = [
    {
      id: 'llm-1',
      name: 'GPT-4o',
      adapterType: 'openai',
      description: 'OpenAI GPT-4o',
      category: 'llm',
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        supportsVision: false,
        supportsStructuredOutput: true,
      },
      pricing: {
        effectiveDate: '2024-01-01T00:00:00.000Z',
        llm: { inputPrice: 2.5, outputPrice: 10, currency: 'USD' },
      },
      pricingHistory: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  const baseCostEstimate = {
    estimatedCostMin: 0.015,
    estimatedCostMax: 0.03,
    currency: 'USD',
    estimatedTextCost: 0.005,
    estimatedLlmCostMin: 0.01,
    estimatedLlmCostMax: 0.025,
    estimatedTokensMin: 1000,
    estimatedTokensMax: 1500,
  };

  const mockExtractionState = {
    cost: { text: 0.005, llm: 0, total: 0.005 },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractionState.cost = { text: 0.005, llm: 0, total: 0.005 };
    mockUseExtractionStore.mockImplementation((selector) => selector(mockExtractionState));
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Single Document Extraction Flow', () => {
    it('shows cost estimate before extraction', async () => {
      const onConfirm = vi.fn();

      render(
        <ExtractConfirmationModal
          open={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          manifestCount={1}
          pageCount={3}
          costEstimate={baseCostEstimate}
          llmModels={mockModels}
          defaultLlmModelId={mockModels[0].id}
        />,
        { wrapper },
      );

      // Show document count and page count
      expect(screen.getByText(/1 document/i)).toBeInTheDocument();
      expect(screen.getByText(/3 pages/i)).toBeInTheDocument();

      // Show cost breakdown
      expect(screen.getAllByText(/Text Cost/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/\$0.0050/)).toBeInTheDocument();
      expect(screen.getAllByText(/LLM Cost/i).length).toBeGreaterThan(0);

      // Total estimate
      expect(screen.getByText(/Total Estimated/i)).toBeInTheDocument();
    });

    it('enables confirm button after checking agreement', async () => {
      render(
        <ExtractConfirmationModal
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          manifestCount={1}
          pageCount={3}
          costEstimate={baseCostEstimate}
          llmModels={mockModels}
          defaultLlmModelId={mockModels[0].id}
        />,
        { wrapper },
      );

      const confirmButton = screen.getByRole('button', { name: /start extraction/i });
      expect(confirmButton).toBeDisabled();

      const checkbox = screen.getByLabelText(/costs will be incurred/i);
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
    });

    it('calls extract mutation with correct parameters', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ExtractConfirmationModal
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          manifestCount={1}
          pageCount={3}
          costEstimate={baseCostEstimate}
          llmModels={mockModels}
          defaultLlmModelId={mockModels[0].id}
        />,
        { wrapper },
      );

      const checkbox = screen.getByLabelText(/costs will be incurred/i);
      fireEvent.click(checkbox);

      const confirmButton = screen.getByRole('button', { name: /start extraction/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith({ llmModelId: mockModels[0].id, promptId: undefined });
      });
    });
  });

  describe('Bulk Extraction Flow', () => {
    it('shows aggregate cost estimate for multiple documents', async () => {
      render(
        <ExtractConfirmationModal
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          manifestCount={2}
          pageCount={5}
          costEstimate={baseCostEstimate}
          llmModels={mockModels}
          defaultLlmModelId={mockModels[0].id}
        />,
        { wrapper },
      );

      expect(screen.getAllByText(/2 documents/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/5 pages/i)).toBeInTheDocument();

      // Check cost breakdown
      expect(screen.getAllByText(/Total Estimated/i).length).toBeGreaterThan(0);
    });

    it('shows budget warning if estimate exceeds budget', async () => {
      const highCostEstimate = {
        estimatedCostMin: 100,
        estimatedCostMax: 150,
        currency: 'USD',
        estimatedTextCost: 0.01,
        estimatedLlmCostMin: 99.99,
        estimatedLlmCostMax: 149.99,
        estimatedTokensMin: 1000,
        estimatedTokensMax: 1500,
      };

      render(
        <ExtractConfirmationModal
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          manifestCount={2}
          pageCount={5}
          costEstimate={highCostEstimate}
          llmModels={mockModels}
          defaultLlmModelId={mockModels[0].id}
          budget={50}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText(/exceed your budget/i)).toBeInTheDocument();
      });
    });
  });

  describe('Extraction Progress with Cost Tracking', () => {
    it('tracks text and LLM costs separately during extraction', () => {
      const jobs = [
        {
          id: 'job-1',
          manifestId: 1,
          manifestName: 'invoice1.pdf',
          status: 'running' as const,
          progress: 50,
          cost: {
            text: 0.003,
            llm: 0,
            total: 0.003,
          },
        },
      ];

      render(
        <ExtractionProgressView
          jobs={jobs}
          totalJobs={1}
          onPause={vi.fn()}
          onStop={vi.fn()}
        />,
        { wrapper },
      );

      expect(screen.getByText(/Text/i)).toBeInTheDocument();
      expect(screen.getAllByText(/\$0.0030/).length).toBeGreaterThan(0);
    });

    it('updates cost tracker in real-time via WebSocket', async () => {
      const { rerender } = render(
        <ExtractionCostTracker budget={10} />,
        { wrapper },
      );

      // Initial state
      expect(screen.getByText(/\$0.01 \/ \$10.00/)).toBeInTheDocument();

      // Simulate WebSocket update
      mockExtractionState.cost = { text: 0.01, llm: 0.02, total: 0.03 };
      rerender(<ExtractionCostTracker budget={10} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0.03 \/ \$10.00/)).toBeInTheDocument();
      });
    });

    it('shows live queue visualization', () => {
      const jobs = [
        { id: 'job-1', manifestId: 1, manifestName: 'invoice1.pdf', status: 'completed' as const, progress: 100 },
        { id: 'job-2', manifestId: 2, manifestName: 'invoice2.pdf', status: 'running' as const, progress: 45 },
        { id: 'job-3', manifestId: 3, manifestName: 'invoice3.pdf', status: 'pending' as const, progress: 0 },
      ];

      render(
        <ExtractionProgressView
          jobs={jobs}
          totalJobs={3}
          onPause={vi.fn()}
          onStop={vi.fn()}
        />,
        { wrapper },
      );

      expect(screen.getByText(/1 complete/i)).toBeInTheDocument();
      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    });
  });

  describe('Cost Accuracy Tracking', () => {
    it('compares estimated vs actual costs', async () => {
      const jobs = [
        {
          id: 'job-1',
          manifestId: 1,
          manifestName: 'invoice1.pdf',
          status: 'completed' as const,
          progress: 100,
          cost: {
            text: 0.003,
            llm: 0.018,
            total: 0.021,
          },
          estimatedCost: 0.025,
        },
      ];

      render(
        <ExtractionProgressView
          jobs={jobs}
          totalJobs={1}
          onPause={vi.fn()}
          onStop={vi.fn()}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText(/Projected total/i)).toBeInTheDocument();
      });
    });
  });
});
