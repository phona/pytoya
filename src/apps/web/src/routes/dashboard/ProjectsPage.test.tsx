import { act, renderWithProviders, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectsPage } from './ProjectsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const setupHandlers = () => {
  server.use(
    http.get('/api/projects', () => HttpResponse.json([])),
    http.get('/api/schemas', () => HttpResponse.json([])),
    http.get('/api/validation/scripts', () => HttpResponse.json([])),
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      if (category === 'ocr') {
        return HttpResponse.json([
          {
            id: 'ocr-1',
            name: 'OCR Model',
            adapterType: 'paddlex',
            description: null,
            category: 'ocr',
            parameters: {},
            isActive: true,
            createdAt: '2025-01-15T00:00:00.000Z',
            updatedAt: '2025-01-15T00:00:00.000Z',
          },
        ]);
      }
      return HttpResponse.json([
        {
          id: 'llm-1',
          name: 'LLM Model',
          adapterType: 'openai',
          description: null,
          category: 'llm',
          parameters: {},
          isActive: true,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]);
    }),
    http.post('/api/projects', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 42,
        name: body.name,
        description: body.description ?? null,
        ownerId: 1,
        userId: 1,
        ocrModelId: body.ocrModelId ?? null,
        llmModelId: body.llmModelId ?? null,
        defaultSchemaId: body.defaultSchemaId ?? null,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      });
    }),
    http.post('/api/schemas', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 100,
        name: body.name,
        projectId: body.projectId,
        jsonSchema: body.jsonSchema ?? {},
        requiredFields: body.requiredFields ?? [],
        description: body.description ?? null,
        extractionStrategy: body.extractionStrategy ?? 'ocr-first',
        systemPromptTemplate: null,
        validationSettings: null,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      });
    }),
    http.patch('/api/projects/:id', async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: Number(params.id),
        name: 'New Project',
        description: null,
        ownerId: 1,
        userId: 1,
        ocrModelId: body.ocrModelId ?? null,
        llmModelId: body.llmModelId ?? null,
        defaultSchemaId: body.defaultSchemaId ?? null,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      });
    }),
  );
};

describe('ProjectsPage', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    navigateMock.mockClear();
  });

  afterAll(() => {
    server.close();
  });

  it('completes project creation flow from the list page', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(<ProjectsPage />);
    });

    await act(async () => {
      const newButtons = screen.getAllByRole('button', { name: /New Project/i });
      await user.click(newButtons[0]);
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'New Project');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/LLM Model/i), 'llm-1');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Create Project/i }));
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/projects/42');
    });
  });
});
