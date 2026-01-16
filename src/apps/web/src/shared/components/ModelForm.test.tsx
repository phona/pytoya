import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

const select = async (
  user: ReturnType<typeof userEvent.setup>,
  element: HTMLElement,
  value: string,
) => {
  await act(async () => {
    await user.selectOptions(element, value);
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

  it('validates required fields', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

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
    await act(async () => {
      fireEvent.submit(submitButton.closest('form') as HTMLFormElement);
    });

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/Base URL is required/i)).toBeInTheDocument();
    });
  });

  it('submits create payload with parsed values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

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
    await select(user, screen.getByLabelText(/Model Family/i), 'gpt-4o');
    await click(user, screen.getByLabelText(/Supports Vision/i));

    const submitButton = screen.getByRole('button', { name: /Create Model/i });
    await act(async () => {
      fireEvent.submit(submitButton.closest('form') as HTMLFormElement);
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
});
