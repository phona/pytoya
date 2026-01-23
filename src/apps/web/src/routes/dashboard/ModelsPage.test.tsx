import { renderWithProviders, screen, waitFor, act } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ModelsPage } from './ModelsPage';
import { server } from '@/tests/mocks/server';

const adapters = [
  {
    type: 'openai',
    name: 'OpenAI',
    description: 'LLM adapter',
    category: 'llm',
    parameters: {
      baseUrl: { type: 'string', required: true, label: 'Base URL' },
      apiKey: { type: 'string', required: true, label: 'API Key', secret: true },
      modelName: { type: 'string', required: true, label: 'Model Name' },
    },
    capabilities: ['llm'],
  },
  {
    type: 'paddlex',
    name: 'PaddleX OCR',
    description: 'OCR adapter',
    category: 'ocr',
    parameters: {
      baseUrl: { type: 'string', required: true, label: 'Base URL' },
    },
    capabilities: ['ocr'],
  },
];

const models = [
  {
    id: 'llm-1',
    name: 'OpenAI GPT-4o',
    adapterType: 'openai',
    description: null,
    category: 'llm',
    parameters: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '********',
      modelName: 'gpt-4o',
    },
    isActive: true,
    createdAt: '2025-01-13T00:00:00.000Z',
    updatedAt: '2025-01-13T00:00:00.000Z',
  },
  {
    id: 'ocr-1',
    name: 'PaddleX OCR',
    adapterType: 'paddlex',
    description: null,
    category: 'ocr',
    parameters: { baseUrl: 'http://localhost:8080' },
    isActive: true,
    createdAt: '2025-01-13T00:00:00.000Z',
    updatedAt: '2025-01-13T00:00:00.000Z',
  },
];

const setupListHandlers = () => {
  server.use(
    http.get('/api/models', () => HttpResponse.json(models)),
    http.get('/api/models/adapters', () => HttpResponse.json(adapters)),
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

describe('ModelsPage', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('shows only LLM models and helper copy', async () => {
    setupListHandlers();
    await act(async () => {
      renderWithProviders(<ModelsPage />);
    });

    await screen.findByRole('heading', { name: 'OpenAI GPT-4o' });
    expect(screen.queryByText('PaddleX OCR')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Models power structured extraction/i),
    ).toBeInTheDocument();
  });

  it('does not crash when dashboard metrics totals are strings', async () => {
    setupListHandlers();
    server.use(
      http.get('/api/metrics/cost-dashboard', () => {
        return HttpResponse.json({
          totalsByCurrency: [
            {
              currency: 'USD',
              documentCount: 7,
              totalCost: '12.3456',
              textCost: '2.5',
              llmCost: '9.8456',
              pagesProcessed: '120',
              llmInputTokens: '120000',
              llmOutputTokens: '24000',
            },
          ],
          costOverTime: [],
          llmByModel: [],
          textByExtractor: [],
        });
      }),
    );

    await act(async () => {
      renderWithProviders(<ModelsPage />);
    });

    await screen.findByRole('heading', { name: 'OpenAI GPT-4o' });
    expect(await screen.findByText(/9\.8456 USD/)).toBeInTheDocument();
  });

  it('creates a model via UI', async () => {
    setupListHandlers();
    const user = userEvent.setup();
    let received: Record<string, unknown> = {};

    server.use(
      http.post('/api/models', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 'llm-2',
          name: received.name,
          adapterType: received.adapterType,
          description: null,
          category: 'llm',
          parameters: received.parameters,
          isActive: true,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        });
      }),
    );

    await act(async () => {
      renderWithProviders(<ModelsPage />);
    });
    await screen.findByRole('heading', { name: 'OpenAI GPT-4o' });

    await click(user, screen.getByRole('button', { name: /New Model/i }));
    await click(user, screen.getByRole('button', { name: /Next/i }));
    await type(user, screen.getByLabelText('Model name'), 'New LLM');
    await type(user, screen.getByLabelText(/Base URL/i), 'http://ocr.local');
    await type(user, screen.getByLabelText(/API Key/i), 'sk-test');
    await type(user, screen.getByLabelText('Model Name'), 'gpt-4o');
    await click(user, screen.getByRole('button', { name: /Create Model/i }));

    await waitFor(() => {
      expect(received).toMatchObject({
        name: 'New LLM',
        adapterType: 'openai',
        parameters: { baseUrl: 'http://ocr.local', apiKey: 'sk-test', modelName: 'gpt-4o' },
      });
    });
  });

  it('edits, tests, and deletes a model', async () => {
    setupListHandlers();
    const user = userEvent.setup();
    let patched: Record<string, unknown> = {};
    let deleted = false;

    server.use(
      http.patch('/api/models/llm-1', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...models[0],
          name: 'Updated OCR',
        });
      }),
      http.post('/api/models/llm-1/test', () =>
        HttpResponse.json({ ok: true, message: 'ok' }),
      ),
      http.delete('/api/models/llm-1', () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await act(async () => {
      renderWithProviders(<ModelsPage />);
    });
    await screen.findByRole('heading', { name: 'OpenAI GPT-4o' });

    await click(user, screen.getByRole('button', { name: /Model actions/i }));
    await click(user, screen.getByRole('menuitem', { name: /Edit/i }));
    const nameInput = screen.getByLabelText('Model name');
    await act(async () => {
      await user.clear(nameInput);
    });
    await type(user, nameInput, 'Updated OCR');
    await click(user, screen.getByRole('button', { name: /Update Model/i }));

    await waitFor(() => {
      expect(patched).toMatchObject({ name: 'Updated OCR' });
    });

    const patchedParameters = (patched.parameters ?? {}) as Record<string, unknown>;
    expect(patchedParameters.apiKey).toBeUndefined();

    await click(user, screen.getByRole('button', { name: /Model actions/i }));
    await click(user, screen.getByRole('menuitem', { name: /Test Connection/i }));
    await screen.findByText('ok');
    await click(user, screen.getByRole('button', { name: /^OK$/i }));

    await click(user, screen.getByRole('button', { name: /Model actions/i }));
    await click(user, screen.getByRole('menuitem', { name: /Delete/i }));
    await click(user, screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => {
      expect(deleted).toBe(true);
    });
  });
});




