import { renderWithProviders, screen, waitFor, act } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectForm } from './ProjectForm';

const ocrModel = {
  id: 'ocr-1',
  name: 'PaddleX OCR',
  adapterType: 'paddlex',
  description: null,
  category: 'ocr',
  parameters: { baseUrl: 'http://localhost:8080' },
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

const setupModelHandlers = () => {
  server.use(
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      if (category === 'ocr') {
        return HttpResponse.json([ocrModel]);
      }
      if (category === 'llm') {
        return HttpResponse.json([llmModel]);
      }
      return HttpResponse.json([ocrModel, llmModel]);
    }),
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

const select = async (
  user: ReturnType<typeof userEvent.setup>,
  element: HTMLElement,
  value: string,
) => {
  await act(async () => {
    await user.selectOptions(element, value);
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
    setupModelHandlers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );
    });

    await type(user, screen.getByLabelText(/Project Name/i), 'New Project');

    await screen.findByRole('option', { name: 'PaddleX OCR' });
    await select(user, screen.getByLabelText(/OCR Model/i), 'ocr-1');
    await select(user, screen.getByLabelText(/LLM Model/i), 'llm-1');

    await click(user, screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'New Project',
        description: undefined,
        ocrModelId: 'ocr-1',
        llmModelId: 'llm-1',
      });
    });
  });

  it('populates selection in edit mode', async () => {
    setupModelHandlers();

    await act(async () => {
      renderWithProviders(
        <ProjectForm
          project={{
            id: 1,
            name: 'Existing',
            description: 'Desc',
            ownerId: 1,
            userId: 1,
            ocrModelId: 'ocr-1',
            llmModelId: 'llm-1',
            defaultPromptId: null,
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

    await screen.findByRole('option', { name: 'PaddleX OCR' });
    expect(screen.getByLabelText(/OCR Model/i)).toHaveValue('ocr-1');
    expect(screen.getByLabelText(/LLM Model/i)).toHaveValue('llm-1');
  });
});
