import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/tests/utils';
import { ExtractorForm } from './ExtractorForm';

describe('ExtractorForm', () => {
  it('submits sanitized config values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <ExtractorForm
        types={[
          {
            id: 'vision-llm',
            name: 'Vision LLM',
            description: 'Vision',
            paramsSchema: {
              baseUrl: { type: 'string', required: true, label: 'Base URL' },
              apiKey: { type: 'string', required: true, label: 'API Key', secret: true },
              temperature: { type: 'number', required: false, label: 'Temperature' },
            },
            pricingSchema: {
              mode: { type: 'enum', required: true, label: 'Pricing Mode', validation: { enum: ['token'] } },
              currency: { type: 'string', required: true, label: 'Currency' },
              inputPricePerMillionTokens: { type: 'number', required: true, label: 'Input Price' },
              outputPricePerMillionTokens: { type: 'number', required: true, label: 'Output Price' },
            },
            supportedFormats: ['image'],
            category: 'vision',
            version: '1.0.0',
          },
        ]}
        extractor={{
          id: 'extractor-1',
          name: 'Vision LLM',
          description: 'Test extractor',
          extractorType: 'vision-llm',
          config: {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'secret',
            temperature: 0.5,
            pricing: {
              mode: 'token',
              currency: 'USD',
              inputPricePerMillionTokens: 2.5,
              outputPricePerMillionTokens: 10,
            },
          },
          isActive: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Updated Extractor' } });
    fireEvent.change(screen.getByLabelText(/Temperature/i), { target: { value: '0.7' } });
    fireEvent.change(screen.getByLabelText(/Input Price/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Output Price/i), { target: { value: '9' } });

    fireEvent.click(screen.getByRole('button', { name: /Update Extractor/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Extractor',
          config: expect.objectContaining({
            temperature: 0.7,
            pricing: expect.objectContaining({
              mode: 'token',
              currency: 'USD',
              inputPricePerMillionTokens: 3,
              outputPricePerMillionTokens: 9,
            }),
          }),
        }),
      );
    });
  });
});
