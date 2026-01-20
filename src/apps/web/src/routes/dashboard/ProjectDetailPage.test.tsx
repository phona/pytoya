import { act, renderWithProviders, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectDetailPage } from './ProjectDetailPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

const setupHandlers = () => {
  server.use(
    http.get('/api/projects/1', () =>
      HttpResponse.json({
        id: 1,
        name: 'Alpha Project',
        description: 'Project description',
        ownerId: 1,
        userId: 1,
        textExtractorId: 'extractor-1',
        llmModelId: 'llm-1',
        defaultSchemaId: 10,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
        _count: { groups: 1, manifests: 5 },
      }),
    ),
    http.get('/api/projects/1/groups', () =>
      HttpResponse.json([
        {
          id: 22,
          name: 'Invoices',
          projectId: 1,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
          _count: { manifests: 2 },
          statusCounts: { pending: 1, failed: 0, verified: 1 },
        },
      ]),
    ),
    http.get('/api/schemas/project/1', () =>
      HttpResponse.json([
        {
          id: 10,
          name: 'Schema 1',
          jsonSchema: { type: 'object', properties: {} },
          requiredFields: [],
          projectId: 1,
          description: null,
          systemPromptTemplate: null,
          validationSettings: null,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]),
    ),
  );
};

describe('ProjectDetailPage', () => {
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

  it('navigates via settings dropdown items', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(<ProjectDetailPage />, { route: '/projects/1' });
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /settings/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('menuitem', { name: /basic/i }));
    });

    expect(navigateMock).toHaveBeenCalledWith('/projects/1/settings/basic');
  });

  it('navigates to group manifests when clicking a group card', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(<ProjectDetailPage />, { route: '/projects/1' });
    });

    await waitFor(() => {
      expect(screen.getByText('Invoices')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /invoices/i }));
    });

    expect(navigateMock).toHaveBeenCalledWith('/projects/1/groups/22/manifests');
  });
});




