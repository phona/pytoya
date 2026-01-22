import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/tests/utils';
import { ValidationScriptForm } from './ValidationScriptForm';

const generateMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/shared/hooks/use-projects', () => ({
  useProjects: () => ({
    projects: [
      {
        id: 1,
        name: 'Test Project',
        llmModelId: 'llm-1',
        defaultSchemaId: 10,
      },
    ],
  }),
  useProject: () => ({
    project: {
      id: 1,
      name: 'Test Project',
      llmModelId: 'llm-1',
      defaultSchemaId: 10,
    },
  }),
}));

vi.mock('@/shared/hooks/use-schemas', () => ({
  useProjectSchemas: () => ({
    schemas: [
      {
        id: 10,
        name: 'Project Schema',
        jsonSchema: { type: 'object', properties: { invoice: { type: 'object' } } },
        requiredFields: ['invoice.po_no'],
        validationSettings: null,
      },
    ],
  }),
}));

vi.mock('@/shared/hooks/use-validation-scripts', () => ({
  useValidateScriptSyntax: () => ({ mutateAsync: vi.fn() }),
  useGenerateValidationScript: () => ({ mutateAsync: generateMutateAsync }),
}));

vi.mock('@/shared/hooks/use-modal-dialog', () => ({
  useModalDialog: () => ({
    confirm: vi.fn(),
    alert: vi.fn(),
    ModalDialog: () => null,
  }),
}));

describe('ValidationScriptForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills structured JSON from project schema and sends it to generate endpoint', async () => {
    renderWithProviders(
      <ValidationScriptForm
        fixedProjectId={1}
        showProjectField={false}
        onSubmit={vi.fn(async () => undefined)}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Uses schema: Project Schema')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Prompt *'), {
      target: { value: 'Ensure PO number exists' },
    });

    generateMutateAsync.mockResolvedValueOnce({
      name: 'Generated Script',
      description: 'Generated validation script',
      severity: 'warning',
      script: 'return true;',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(generateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        llmModelId: 'llm-1',
        prompt: 'Ensure PO number exists',
        structured: expect.objectContaining({
          jsonSchema: { type: 'object', properties: { invoice: { type: 'object' } } },
          requiredFields: ['invoice.po_no'],
        }),
      }),
    );
  });
});
