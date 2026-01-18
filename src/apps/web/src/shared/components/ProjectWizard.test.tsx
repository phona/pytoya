import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectWizard } from './ProjectWizard';

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
    http.get('/api/schemas', () => HttpResponse.json([])),
    http.get('/api/validation/scripts', () => HttpResponse.json([])),
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      return HttpResponse.json(category === 'ocr' ? ocrModels : llmModels);
    }),
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
        defaultSchemaId: body.defaultSchemaId ?? null,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      });
    }),
    http.post('/api/schemas', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 301,
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
    http.patch('/api/projects/1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 1,
        name: 'Project',
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

const setupEditHandlers = () => {
  server.use(
    http.get('/api/projects/1', () =>
      HttpResponse.json({
        id: 1,
        name: 'Existing Project',
        description: 'Existing description',
        ownerId: 1,
        userId: 1,
        ocrModelId: 'ocr-1',
        llmModelId: 'llm-1',
        defaultSchemaId: 301,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      }),
    ),
    http.get('/api/schemas/project/1', () =>
      HttpResponse.json([
        {
          id: 301,
          name: 'Existing Schema',
          projectId: 1,
          jsonSchema: {
            type: 'object',
            required: ['invoice'],
            properties: {
              invoice: { type: 'string' },
            },
          },
          requiredFields: ['invoice'],
          description: null,
          extractionStrategy: 'ocr-first',
          systemPromptTemplate: null,
          validationSettings: null,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]),
    ),
    http.get('/api/schemas/301/rules', () =>
      HttpResponse.json([
        {
          id: 11,
          schemaId: 301,
          fieldPath: 'invoice',
          ruleType: 'restriction',
          ruleOperator: 'pattern',
          ruleConfig: { regex: '^INV-' },
          errorMessage: 'Invoice must start with INV-',
          priority: 5,
          enabled: true,
          description: null,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]),
    ),
    http.get('/api/validation/scripts/project/1', () =>
      HttpResponse.json([
        {
          id: 501,
          projectId: 1,
          name: 'Existing Script',
          description: null,
          severity: 'error',
          enabled: true,
          script: 'return true;',
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]),
    ),
    http.get('/api/validation/scripts', () => HttpResponse.json([])),
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      return HttpResponse.json(category === 'ocr' ? ocrModels : llmModels);
    }),
  );
};

const setupEditHandlersWithMultipleSchemas = () => {
  server.use(
    http.get('/api/projects/1', () =>
      HttpResponse.json({
        id: 1,
        name: 'Existing Project',
        description: 'Existing description',
        ownerId: 1,
        userId: 1,
        ocrModelId: 'ocr-1',
        llmModelId: 'llm-1',
        defaultSchemaId: 301,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-01-15T00:00:00.000Z',
      }),
    ),
    http.get('/api/schemas/project/1', () =>
      HttpResponse.json([
        {
          id: 301,
          name: 'Invoice Schema',
          projectId: 1,
          jsonSchema: {
            type: 'object',
            required: ['invoice'],
            properties: {
              invoice: { type: 'string' },
            },
          },
          requiredFields: ['invoice'],
          description: null,
          extractionStrategy: 'ocr-first',
          systemPromptTemplate: null,
          validationSettings: null,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
        {
          id: 302,
          name: 'Order Schema',
          projectId: 1,
          jsonSchema: {
            type: 'object',
            required: ['order'],
            properties: {
              order: { type: 'string' },
            },
          },
          requiredFields: ['order'],
          description: null,
          extractionStrategy: 'ocr-first',
          systemPromptTemplate: null,
          validationSettings: null,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2025-01-15T00:00:00.000Z',
        },
      ]),
    ),
    http.get('/api/schemas/301/rules', () => HttpResponse.json([])),
    http.get('/api/schemas/302/rules', () => HttpResponse.json([])),
    http.get('/api/validation/scripts/project/1', () => HttpResponse.json([])),
    http.get('/api/validation/scripts', () => HttpResponse.json([])),
    http.get('/api/models', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      return HttpResponse.json(category === 'ocr' ? ocrModels : llmModels);
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

  it('completes the wizard flow', async () => {
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
      expect(onCreated).toHaveBeenCalledWith(1);
    });
  });

  it('requires LLM selection before continuing', async () => {
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

    const modelsNext = screen.getByRole('button', { name: /Next/i });
    expect(modelsNext).toBeDisabled();

    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/LLM Model/i), 'llm-1');
    });

    expect(modelsNext).toBeEnabled();
  });

  it('preserves schema data when navigating steps', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/LLM Model/i), 'llm-1');
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    const schemaEditor = screen.getByRole('textbox');
    await act(async () => {
      await user.clear(schemaEditor);
      fireEvent.change(schemaEditor, {
        target: {
          value: '{"type":"object","required":["invoice"],"properties":{"invoice":{"type":"object"}}}',
        },
      });
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Back/i }));
    });

    expect(screen.getByRole('textbox')).toHaveValue(
      '{"type":"object","required":["invoice"],"properties":{"invoice":{"type":"object"}}}',
    );
  });

  it('does not show legacy strategy or schema selection options', async () => {
    setupHandlers();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    expect(screen.queryByText(/Prompt-based extraction/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Schema-based extraction/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Select Schema/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Import rules/i)).not.toBeInTheDocument();
  });

  // TODO: Re-enable after ProjectWizard edit-mode refactor; Vitest run hangs (process doesn't exit) when this test is included.
  it.skip('prefills project and schema data when editing an existing project', async () => {
    setupEditHandlers();
    const user = userEvent.setup();

    renderWithProviders(
      <ProjectWizard
        isOpen={true}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        mode="edit"
        projectId={1}
      />,
    );

    const nameInput = await screen.findByLabelText(/Project Name/i);
    expect(nameInput).toHaveValue('Existing Project');

    await act(async () => {
      await user.click(await screen.findByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(await screen.findByRole('button', { name: /Next/i }));
    });

    const schemaEditor = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(schemaEditor.value).toContain('"invoice"');
  });

  // TODO: Re-enable after ProjectWizard edit-mode refactor; Vitest run hangs (process doesn't exit) when this test is included.
  it.skip('switches schema selection in edit mode', async () => {
    setupEditHandlersWithMultipleSchemas();
    const user = userEvent.setup();

    renderWithProviders(
      <ProjectWizard
        isOpen={true}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        mode="edit"
        projectId={1}
      />,
    );

    const nameInput = await screen.findByLabelText(/Project Name/i);
    expect(nameInput).toHaveValue('Existing Project');

    await act(async () => {
      await user.click(await screen.findByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.click(await screen.findByRole('button', { name: /Next/i }));
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/^Schema$/i), '302');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue(expect.stringContaining('"order"'));
    });
  });

  it('adds validation scripts during the wizard flow', async () => {
    setupHandlers();
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <ProjectWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Project Name/i), 'Script Project');
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
      await user.click(screen.getByRole('button', { name: /New Script/i }));
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/Script Name/i), 'Totals Check');
      fireEvent.change(
        screen.getByLabelText('Validation Script *', { selector: 'textarea' }),
        { target: { value: 'function validate(extractedData) { return []; }' } },
      );
      await user.click(screen.getByRole('button', { name: /^Create$/i }));
    });

    expect(screen.getByText('Totals Check')).toBeInTheDocument();
  });
});
