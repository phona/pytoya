import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { ProjectSettingsSchemaPage } from './ProjectSettingsSchemaPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

describe('ProjectSettingsSchemaPage', () => {
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

  it('updates schema via API when submitting edit form', async () => {
    const user = userEvent.setup();
    let schema = {
      id: 1,
      name: 'Invoice Schema',
      jsonSchema: { type: 'object', properties: {}, required: [] },
      requiredFields: [],
      projectId: 1,
      description: null,
      systemPromptTemplate: null,
      validationSettings: null,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    };
    let patched: Record<string, unknown> | null = null;

    server.use(
      http.get('/api/schemas/project/1', () => HttpResponse.json([schema])),
      http.get('/api/schemas/:id', () => HttpResponse.json(schema)),
      http.patch('/api/schemas/:id', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        schema = {
          ...schema,
          ...patched,
          updatedAt: '2026-01-20T00:00:00.000Z',
        };
        return HttpResponse.json(schema);
      }),
    );

    await act(async () => {
      renderWithProviders(<ProjectSettingsSchemaPage />, { route: '/projects/1/settings/schema' });
    });

    await screen.findByText('Invoice Schema');

    await user.click(screen.getByRole('button', { name: /Edit Schema/i }));
    await screen.findByText('Edit Schema');

    const nextJsonSchema = {
      type: 'object',
      properties: { invoiceNo: { type: 'string' } },
      required: ['invoiceNo'],
    };
    const editor = screen.getByPlaceholderText(/"type": "object"/i);
    fireEvent.change(editor, { target: { value: JSON.stringify(nextJsonSchema, null, 2) } });

    await user.click(screen.getByRole('button', { name: /^Update$/i }));

    await waitFor(() => {
      expect(patched).toEqual({ jsonSchema: nextJsonSchema });
    });
  });
});

