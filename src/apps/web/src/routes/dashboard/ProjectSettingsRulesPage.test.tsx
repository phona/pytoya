import { act, renderWithProviders, screen } from '@/tests/utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { ProjectSettingsRulesPage } from './ProjectSettingsRulesPage';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

describe('ProjectSettingsRulesPage', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    navigateMock.mockClear();
  });

  afterAll(() => {
    server.close();
  });

  it('renders rules editor when schema exists', async () => {
    const schema = {
      id: 1,
      name: 'Invoice Schema',
      jsonSchema: { type: 'object', properties: { invoiceNo: { type: 'string' } }, required: ['invoiceNo'] },
      requiredFields: [],
      projectId: 1,
      description: null,
      systemPromptTemplate: null,
      validationSettings: null,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    };

    server.use(
      http.get('/api/schemas/project/1', () => HttpResponse.json([schema])),
      http.get('/api/schemas/:id', () => HttpResponse.json(schema)),
    );

    await act(async () => {
      renderWithProviders(<ProjectSettingsRulesPage />, { route: '/projects/1/settings/rules' });
    });

    await screen.findByText('Invoice Schema');
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByText(/Prompt Rules/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter prompt rules as Markdown/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Generate$/i })).toBeInTheDocument();
  });

  it('shows a warning and navigates to Schema settings when no schema exists', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    server.use(
      http.get('/api/schemas/project/1', () => HttpResponse.json([])),
    );

    await act(async () => {
      renderWithProviders(<ProjectSettingsRulesPage />, { route: '/projects/1/settings/rules' });
    });

    await screen.findByText(/Rules require schema fields/i);

    await user.click(screen.getByRole('button', { name: /Go to Schema/i }));
    expect(navigateMock).toHaveBeenCalledWith('/projects/1/settings/schema');
  });

  it('shows a warning when schema is empty', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    const schema = {
      id: 1,
      name: 'Empty Schema',
      jsonSchema: { type: 'object', properties: {}, required: [] },
      requiredFields: [],
      projectId: 1,
      description: null,
      systemPromptTemplate: null,
      validationSettings: null,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    };

    server.use(
      http.get('/api/schemas/project/1', () => HttpResponse.json([schema])),
      http.get('/api/schemas/:id', () => HttpResponse.json(schema)),
    );

    await act(async () => {
      renderWithProviders(<ProjectSettingsRulesPage />, { route: '/projects/1/settings/rules' });
    });

    await screen.findByText(/Rules require schema fields/i);

    await user.click(screen.getByRole('button', { name: /Go to Schema/i }));
    expect(navigateMock).toHaveBeenCalledWith('/projects/1/settings/schema');
  });
});
