import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/tests/utils';
import type { Model } from '@/api/models';
import { modelsApi } from '@/api/models';
import { ModelPricingEditor } from './ModelPricingEditor';

vi.mock('@/api/models', () => ({
  modelsApi: {
    updateModelPricing: vi.fn(),
  },
}));

describe('ModelPricingEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves pricing for a model', async () => {
    const model: Model = {
      id: 'llm-1',
      name: 'GPT-4o',
      adapterType: 'openai',
      description: null,
      category: 'llm',
      parameters: {},
      pricing: {
        effectiveDate: '2025-01-01T00:00:00.000Z',
        llm: { inputPrice: 2.5, outputPrice: 10.0, currency: 'USD' },
      },
      pricingHistory: [],
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    vi.mocked(modelsApi.updateModelPricing).mockResolvedValue(model as any);

    renderWithProviders(<ModelPricingEditor model={model} />);

    fireEvent.change(screen.getByLabelText(/Input price/i), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText(/Output price/i), { target: { value: '0.8' } });
    fireEvent.click(screen.getByRole('button', { name: /Save pricing/i }));

    await waitFor(() => {
      expect(modelsApi.updateModelPricing).toHaveBeenCalledWith('llm-1', {
        llm: { inputPrice: 0.2, outputPrice: 0.8, currency: 'USD' },
      });
    });
  });
});
