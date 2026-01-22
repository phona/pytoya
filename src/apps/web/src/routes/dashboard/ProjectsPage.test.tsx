import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/tests/utils';
import { within } from '@testing-library/react';
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
    http.get('/api/models', () => {
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
    http.get('/api/extractors', () =>
      HttpResponse.json([
        {
          id: 'extractor-1',
          name: 'Vision LLM - GPT-4o',
          description: 'OpenAI GPT-4o vision',
          extractorType: 'vision-llm',
          config: {},
          isActive: true,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]),
    ),
    http.post('/api/projects', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 42,
        name: body.name,
        description: body.description ?? null,
        ownerId: 1,
        userId: 1,
        textExtractorId: body.textExtractorId ?? null,
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
        textExtractorId: body.textExtractorId ?? null,
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

  it('completes quick create flow from the list page', async () => {
    setupHandlers();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(<ProjectsPage />);
    });

    await act(async () => {
      const newButtons = screen.getAllByRole('button', { name: /New Project/i });
      await user.click(newButtons[0]);
    });

    await act(async () => {
      await user.click(screen.getByRole('menuitem', { name: /Quick Create/i }));
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'New Project');
    });

    await act(async () => {
      await user.click(screen.getByLabelText(/Text Extractor/i));
    });
    const extractorListbox = await screen.findByRole('listbox');
    await act(async () => {
      const option = within(extractorListbox).getByRole('option', { name: /Vision LLM - GPT-4o/i });
      fireEvent.pointerDown(option);
      fireEvent.click(option);
    });

    await act(async () => {
      await user.click(screen.getByLabelText(/LLM Model/i));
    });
    const listbox = await screen.findByRole('listbox');
    await act(async () => {
      const option = within(listbox).getByRole('option', { name: /LLM Model/i });
      fireEvent.pointerDown(option);
      fireEvent.click(option);
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Create Project/i }));
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/projects/42');
    });
  });

  it('does not navigate when clicking edit/delete actions on a project card', async () => {
    setupHandlers();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const deleteSpy = vi.fn();

    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json([
          {
            id: 1,
            name: 'Test Project',
            description: 'Test project description',
            ownerId: 1,
            userId: 1,
            textExtractorId: 'extractor-1',
            llmModelId: 'llm-1',
            defaultSchemaId: null,
            createdAt: '2025-01-15T00:00:00.000Z',
            updatedAt: '2025-01-15T00:00:00.000Z',
            _count: { groups: 2, manifests: 5 },
          },
        ]),
      ),
      http.delete('/api/projects/:id', ({ params }) => {
        deleteSpy(Number(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await act(async () => {
      renderWithProviders(<ProjectsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Edit project Test Project/i }));
    });
    expect(navigateMock).not.toHaveBeenCalled();

    const editDialog = await screen.findByRole('dialog');
    await act(async () => {
      await user.click(within(editDialog).getByRole('button', { name: /^Cancel$/i }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Delete project Test Project/i }));
    });
    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      await user.click(within(dialog).getByRole('button', { name: /^Cancel$/i }));
    });
    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Delete project Test Project/i }));
    });
    const dialog2 = await screen.findByRole('dialog');
    await act(async () => {
      await user.click(within(dialog2).getByRole('button', { name: /^Delete$/i }));
    });

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(1);
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});




