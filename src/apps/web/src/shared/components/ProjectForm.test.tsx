import { renderWithProviders, screen, waitFor, act, fireEvent } from '@/tests/utils';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectForm } from './ProjectForm';

const textExtractor = {
  id: 'extractor-1',
  name: 'Vision LLM - GPT-4o',
  description: 'OpenAI GPT-4o vision',
  extractorType: 'vision-llm',
  config: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '********',
    model: 'gpt-4o',
  },
  isActive: true,
  createdAt: '2025-01-13T00:00:00.000Z',
  updatedAt: '2025-01-13T00:00:00.000Z',
};

const llmModel = {
  id: 'llm-1',
  name: 'OpenAI GPT-4o',
  adapterType: 'openai',
  description: null,
  category: 'llm',
  parameters: { baseUrl: 'https://api.openai.com/v1' },
  isActive: true,
  createdAt: '2025-01-13T00:00:00.000Z',
  updatedAt: '2025-01-13T00:00:00.000Z',
};

const setupHandlers = () => {
  server.use(
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      if (category === 'llm') {
        return HttpResponse.json([llmModel]);
      }
      return HttpResponse.json([llmModel]);
    }),
    http.get('/api/extractors', () => HttpResponse.json([textExtractor])),
  );
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

describe('ProjectForm', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('submits create payload with selected models', async () => {
    setupHandlers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(
        <ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );
    });

    await type(user, screen.getByLabelText(/Project Name/i), 'New Project');

    await selectOption(user, /Text Extractor/i, 'Vision LLM - GPT-4o');
    await selectOption(user, /LLM model/i, 'OpenAI GPT-4o');

    await click(user, screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'New Project',
        description: undefined,
        textExtractorId: 'extractor-1',
        llmModelId: 'llm-1',
      });
    });
  });

  it('populates selection in edit mode', async () => {
    setupHandlers();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(
        <ProjectForm
          project={{
            id: 1,
            name: 'Existing',
            description: 'Desc',
            ownerId: 1,
            userId: 1,
            textExtractorId: 'extractor-1',
            llmModelId: 'llm-1',
            defaultSchemaId: null,
            createdAt: '2025-01-13T00:00:00.000Z',
            updatedAt: '2025-01-13T00:00:00.000Z',
            _count: { groups: 0, manifests: 0 },
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
    });

    await act(async () => {
      await user.click(screen.getByLabelText(/Text Extractor/i));
    });
    expect(
      within(screen.getByRole('listbox')).getByRole('option', { name: 'Vision LLM - GPT-4o' })
    ).toHaveAttribute('aria-selected', 'true');

    await act(async () => {
      await user.click(screen.getByLabelText(/LLM model/i));
    });
    expect(
      within(screen.getByRole('listbox')).getByRole('option', { name: 'OpenAI GPT-4o' })
    ).toHaveAttribute('aria-selected', 'true');
  });
});




