import { renderWithProviders, screen, waitFor, act } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import { ModelsPage } from './ModelsPage';
import { server } from '@/tests/mocks/server';

const adapters = [
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
  {
    type: 'openai',
    name: 'OpenAI',
    description: 'LLM adapter',
    category: 'llm',
    parameters: {
      baseUrl: { type: 'string', required: true, label: 'Base URL' },
      apiKey: { type: 'string', required: true, label: 'API Key', secret: true },
    },
    capabilities: ['llm'],
  },
];

const models = [
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
  {
    id: 'llm-1',
    name: 'OpenAI GPT-4o',
    adapterType: 'openai',
    description: null,
    category: 'llm',
    parameters: { baseUrl: 'https://api.openai.com/v1', apiKey: '********' },
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

  it('shows OCR models by default and switches tabs', async () => {
    setupListHandlers();
    const user = userEvent.setup();
    await act(async () => {
      renderWithProviders(<ModelsPage />);
    });

    await screen.findByText('PaddleX OCR');
    expect(screen.queryByText('OpenAI GPT-4o')).not.toBeInTheDocument();

    await click(user, screen.getByRole('button', { name: /LLM Models/i }));
    await screen.findByText('OpenAI GPT-4o');
  });

  it('creates a model via UI', async () => {
    setupListHandlers();
    const user = userEvent.setup();
    let received: Record<string, unknown> = {};

    server.use(
      http.post('/api/models', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 'ocr-2',
          name: received.name,
          adapterType: received.adapterType,
          description: null,
          category: 'ocr',
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
    await screen.findByText('PaddleX OCR');

    await click(user, screen.getByRole('button', { name: /New Model/i }));
    await click(user, screen.getByRole('button', { name: /Next/i }));
    await type(user, screen.getByLabelText(/Name/i), 'New OCR');
    await type(user, screen.getByLabelText(/Base URL/i), 'http://ocr.local');
    await click(user, screen.getByRole('button', { name: /Create Model/i }));

    await waitFor(() => {
      expect(received).toMatchObject({
        name: 'New OCR',
        adapterType: 'paddlex',
        parameters: { baseUrl: 'http://ocr.local' },
      });
    });
  });

  it('edits, tests, and deletes a model', async () => {
    setupListHandlers();
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    let patched: Record<string, unknown> = {};
    let deleted = false;

    server.use(
      http.patch('/api/models/ocr-1', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...models[0],
          name: 'Updated OCR',
        });
      }),
      http.post('/api/models/ocr-1/test', () =>
        HttpResponse.json({ ok: true, message: 'ok' }),
      ),
      http.delete('/api/models/ocr-1', () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await act(async () => {
      renderWithProviders(<ModelsPage />);
    });
    await screen.findByText('PaddleX OCR');

    await click(user, screen.getByRole('button', { name: /Model actions/i }));
    await click(user, screen.getByRole('menuitem', { name: /Edit/i }));
    const nameInput = screen.getByLabelText(/Name/i);
    await act(async () => {
      await user.clear(nameInput);
    });
    await type(user, nameInput, 'Updated OCR');
    await click(user, screen.getByRole('button', { name: /Update Model/i }));

    await waitFor(() => {
      expect(patched).toMatchObject({ name: 'Updated OCR' });
    });

    await click(user, screen.getByRole('button', { name: /Model actions/i }));
    await click(user, screen.getByRole('menuitem', { name: /Test Connection/i }));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('ok');
    });

    await click(user, screen.getByRole('button', { name: /Model actions/i }));
    await click(user, screen.getByRole('menuitem', { name: /Delete/i }));
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(deleted).toBe(true);
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});




