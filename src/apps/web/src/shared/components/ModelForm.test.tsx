import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { AdapterSchema } from '@/api/models';
import { ModelForm } from './ModelForm';

const adapter: AdapterSchema = {
  type: 'openai',
  name: 'OpenAI',
  description: 'OpenAI adapter',
  category: 'llm' as const,
  capabilities: ['llm'],
  parameters: {
    baseUrl: {
      type: 'string',
      required: true,
      label: 'Base URL',
      placeholder: 'https://api.openai.com/v1',
    },
    apiKey: {
      type: 'string',
      required: true,
      label: 'API Key',
      secret: true,
    },
    temperature: {
      type: 'number',
      required: false,
      label: 'Temperature',
      default: 0.7,
      validation: { min: 0, max: 2 },
    },
    supportsVision: {
      type: 'boolean',
      required: false,
      label: 'Supports Vision',
      default: false,
    },
    modelFamily: {
      type: 'enum',
      required: false,
      label: 'Model Family',
      validation: { enum: ['gpt-4o', 'gpt-4o-mini'] },
    },
  },
};

const click = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.click(element);
  });
};

const type = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) => {
  await act(async () => {
    await user.type(element, text);
  });
};

const clear = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.clear(element);
  });
};

const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
  optionText: string,
) => {
  await act(async () => {
    await user.click(screen.getByLabelText(label));
  });
  const listbox = await screen.findByRole('listbox');
  await act(async () => {
    const option = within(listbox).getByRole('option', { name: optionText });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
  });
  await waitFor(() => {
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
};

describe('ModelForm', () => {
  it('renders adapter parameter fields', () => {
    render(
      <ModelForm
        adapter={adapter}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Base URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Temperature/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Supports Vision/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Model Family/i)).toBeInTheDocument();
  });

  it('allows decimal input for number parameters', () => {
    render(
      <ModelForm
        adapter={adapter}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const temperatureInput = screen.getByLabelText(/Temperature/i);
    expect(temperatureInput).toHaveAttribute('step', 'any');
  });

  it('validates required fields', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <ModelForm
        adapter={adapter}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await type(user, screen.getByLabelText(/Name/i), 'Required Name');
    await type(user, screen.getByLabelText(/API Key/i), 'sk-required');
    const submitButton = screen.getByRole('button', { name: /Create Model/i });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Expected ModelForm to render inside a form element.');
    }
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits create payload with parsed values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <ModelForm
        adapter={adapter}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await type(user, screen.getByLabelText(/Name/i), 'OpenAI GPT-4o');
    await type(user, screen.getByLabelText(/Base URL/i), 'https://api.openai.com/v1');
    await type(user, screen.getByLabelText(/API Key/i), 'sk-test');
    await clear(user, screen.getByLabelText(/Temperature/i));
    await type(user, screen.getByLabelText(/Temperature/i), '0.2');
    await selectOption(user, /Model Family/i, 'gpt-4o');
    await click(user, screen.getByLabelText(/Supports Vision/i));

    const submitButton = screen.getByRole('button', { name: /Create Model/i });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Expected ModelForm to render inside a form element.');
    }
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'OpenAI GPT-4o',
          adapterType: 'openai',
          parameters: expect.objectContaining({
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-test',
            temperature: 0.2,
            supportsVision: true,
            modelFamily: 'gpt-4o',
          }),
        }),
      );
    });
  });

  it('omits pricing on update when unchanged', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ModelForm
        adapter={adapter}
        model={{
          id: 'model-1',
          name: 'OpenAI GPT-4o',
          adapterType: 'openai',
          description: null,
          category: 'llm',
          parameters: {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-test',
            modelFamily: 'gpt-4o',
          },
          pricing: {
            effectiveDate: '2025-01-13T00:00:00.000Z',
            llm: { inputPrice: 2.5, outputPrice: 10, currency: 'USD' },
          },
          pricingHistory: [],
          isActive: true,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        } as any}
        canEditPricing
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /Update Model/i });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Expected ModelForm to render inside a form element.');
    }
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('pricing');
  });

  it('includes pricing on update when changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <ModelForm
        adapter={adapter}
        model={{
          id: 'model-2',
          name: 'OpenAI GPT-4o',
          adapterType: 'openai',
          description: null,
          category: 'llm',
          parameters: {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-test',
            modelFamily: 'gpt-4o',
          },
          pricing: {
            effectiveDate: '2025-01-13T00:00:00.000Z',
            llm: { inputPrice: 2.5, outputPrice: 10, currency: 'USD' },
          },
          pricingHistory: [],
          isActive: true,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        } as any}
        canEditPricing
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await clear(user, screen.getByLabelText(/Input price/i));
    await type(user, screen.getByLabelText(/Input price/i), '0.2');

    const submitButton = screen.getByRole('button', { name: /Update Model/i });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Expected ModelForm to render inside a form element.');
    }
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: {
            llm: expect.objectContaining({
              inputPrice: 0.2,
              outputPrice: 10,
              currency: 'USD',
            }),
          },
        }),
      );
    });
  });
});




