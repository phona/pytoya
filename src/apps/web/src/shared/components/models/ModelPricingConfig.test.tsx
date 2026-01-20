import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@/tests/utils';
import type { Model } from '@/api/models';
import { modelsApi } from '@/api/models';
import { ModelPricingConfig } from './ModelPricingConfig';

vi.mock('@/api/models', () => ({
  modelsApi: {
    updateModelPricing: vi.fn(),
  },
}));

describe('ModelPricingConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates pricing for an LLM model', async () => {
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

    vi.mocked(modelsApi.updateModelPricing).mockResolvedValue({} as any);

    render(<ModelPricingConfig models={[model]} />);

    const row = screen.getByText('GPT-4o').closest('tr');
    if (!row) {
      throw new Error('Expected model row to render');
    }

    const toggleButton = within(row).getAllByRole('button')[0];
    fireEvent.click(toggleButton);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    const inputPrice = screen.getByLabelText(/Input Price/i);
    const outputPrice = screen.getByLabelText(/Output Price/i);
    fireEvent.change(inputPrice, { target: { value: '0.2' } });
    fireEvent.change(outputPrice, { target: { value: '0.8' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(modelsApi.updateModelPricing).toHaveBeenCalledWith('llm-1', {
        llm: {
          inputPrice: 0.2,
          outputPrice: 0.8,
          currency: 'USD',
        },
      });
    });
  });
});
