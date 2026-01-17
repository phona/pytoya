import { act, renderWithProviders, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectWizard } from './ProjectWizard';

const schemas = [
  {
    id: 101,
    name: 'Invoice Schema',
    description: 'Default invoice schema',
    jsonSchema: { type: 'object', properties: {} },
    requiredFields: ['invoice.po_no'],
    projectId: null,
    isTemplate: false,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  },
];

const templates = [
  {
    id: 201,
    name: 'Template Schema',
    description: 'Template',
    jsonSchema: { type: 'object', properties: {} },
    requiredFields: ['items'],
    projectId: null,
    isTemplate: true,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  },
];

const ocrModels = [
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
];

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

const setupHandlers = () => {
  server.use(
    http.get('/api/schemas', () => HttpResponse.json(schemas)),
    http.get('/api/schemas/templates', () => HttpResponse.json(templates)),
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      return HttpResponse.json(category === 'ocr' ? ocrModels : llmModels);
    }),
    http.post('/api/extraction/optimize-prompt', () =>
      HttpResponse.json({ prompt: 'Optimized prompt text' }),
    ),
    http.post('/api/projects', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 1,
        name: body.name,
        description: body.description ?? null,
        ownerId: 1,
        userId: 1,
        ocrModelId: body.ocrModelId ?? null,
        llmModelId: body.llmModelId ?? null,
        defaultPromptId: null,
        defaultSchemaId: body.defaultSchemaId ?? null,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      });
    }),
    http.post('/api/schemas', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 301,
        ...body,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      });
    }),
    http.patch('/api/projects/1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 1,
        name: 'Project',
        description: null,
        ownerId: 1,
        userId: 1,
        ocrModelId: null,
        llmModelId: null,
        defaultPromptId: null,
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

  it('completes prompt-based flow', async () => {
    setupHandlers();
    const onCreated = vi.fn();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={onCreated} />,
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'New Project');
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByText(/Choose how extraction rules/i);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Prompt-based extraction/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByLabelText(/Describe your extraction needs/i);

    await act(async () => {
      await user.type(
        screen.getByLabelText(/Describe your extraction needs/i),
        'Extract invoice totals',
      );
      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }));
    });

    await screen.findByDisplayValue('Optimized prompt text');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByLabelText(/OCR Model/i);

    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/OCR Model/i), 'ocr-1');
      await user.selectOptions(screen.getByLabelText(/LLM Model/i), 'llm-1');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Create Project/i }));
    });

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(1);
    });
  });

  it('allows selecting an existing schema', async () => {
    setupHandlers();
    const onCreated = vi.fn();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={onCreated} />,
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Schema Project');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByText(/Choose how extraction rules/i);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Schema-based extraction/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByLabelText(/Select Schema/i);

    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/Select Schema/i), '101');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Create Project/i }));
    });

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(1);
    });
  });

  it('requires required fields before continuing', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
    });
    expect(nextButton).toBeEnabled();

    await act(async () => {
      await user.click(nextButton);
    });

    await screen.findByText(/Choose how extraction rules/i);

    const nextStepButton = screen.getByRole('button', { name: /Next/i });
    expect(nextStepButton).toBeDisabled();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Schema-based extraction/i }));
    });
    expect(nextStepButton).toBeEnabled();
  });

  it('preserves prompt data when navigating steps', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Prompt Project');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByText(/Choose how extraction rules/i);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Prompt-based extraction/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByLabelText(/Describe your extraction needs/i);

    await act(async () => {
      await user.type(
        screen.getByLabelText(/Describe your extraction needs/i),
        'Need totals',
      );
      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }));
    });

    await screen.findByDisplayValue('Optimized prompt text');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByLabelText(/OCR Model/i);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Back/i }));
    });

    expect(screen.getByDisplayValue('Optimized prompt text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Need totals')).toBeInTheDocument();
  });

  it('shows an error when prompt optimization fails', async () => {
    setupHandlers();
    server.use(
      http.post('/api/extraction/optimize-prompt', () =>
        HttpResponse.json({ message: 'Failure' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Prompt Project');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByText(/Choose how extraction rules/i);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Prompt-based extraction/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await screen.findByLabelText(/Describe your extraction needs/i);

    await act(async () => {
      await user.type(
        screen.getByLabelText(/Describe your extraction needs/i),
        'Need totals',
      );
      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }));
    });

    await screen.findByText(/Failed to optimize prompt|Failure/i);
  });
});
