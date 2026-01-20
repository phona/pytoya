import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/tests/utils';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectWizard } from './ProjectWizard';

const llmModels = [
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
];

const textExtractors = [
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
];

const setupHandlers = () => {
  server.use(
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      if (category === 'llm') {
        return HttpResponse.json(llmModels);
      }
      return HttpResponse.json([]);
    }),
    http.get('/api/extractors', () => HttpResponse.json(textExtractors)),
    http.post('/api/projects', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 1,
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
  );
};

describe('ProjectWizard', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('completes quick create flow', async () => {
    setupHandlers();
    const onCreated = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={onCreated} />,
      );
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
      expect(onCreated).toHaveBeenCalledWith(1);
    });
  });

  it('requires name and model before submitting', async () => {
    setupHandlers();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    const createButton = screen.getByRole('button', { name: /Create Project/i });
    expect(createButton).toBeDisabled();

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Quick Project');
    });

    expect(createButton).toBeDisabled();

    await act(async () => {
      await user.click(screen.getByLabelText(/LLM Model/i));
    });
    const listbox = await screen.findByRole('listbox');
    await act(async () => {
      const option = within(listbox).getByRole('option', { name: /LLM Model/i });
      fireEvent.pointerDown(option);
      fireEvent.click(option);
    });

    expect(createButton).toBeDisabled();

    await act(async () => {
      await user.click(screen.getByLabelText(/Text Extractor/i));
    });
    const extractorListbox = await screen.findByRole('listbox');
    await act(async () => {
      const option = within(extractorListbox).getByRole('option', { name: /Vision LLM - GPT-4o/i });
      fireEvent.pointerDown(option);
      fireEvent.click(option);
    });

    expect(createButton).toBeEnabled();
  });
});




