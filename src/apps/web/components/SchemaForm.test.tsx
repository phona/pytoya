import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SchemaForm } from './SchemaForm';
import { CreateSchemaDto, UpdateSchemaDto, Schema } from '@/lib/api/schemas';

// Mock the projects hook
jest.mock('@/hooks/use-projects', () => ({
  useProjects: () => ({
    projects: [
      { id: 1, name: 'Project 1' },
      { id: 2, name: 'Project 2' },
    ],
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('SchemaForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create mode', () => {
    it('should render form fields', () => {
      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/Schema Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/JSON Schema/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Required Fields/i)).toBeInTheDocument();
    });

    it('should submit valid schema', async () => {
      const user = userEvent.setup();

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Schema Name/i), 'Test Schema');
      await user.selectOptions(screen.getByLabelText(/Project/i), '1');

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Create/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should cancel form submission', async () => {
      const user = userEvent.setup();

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Edit mode', () => {
    const existingSchema: Schema = {
      id: 1,
      name: 'Existing Schema',
      projectId: 1,
      jsonSchema: { type: 'object', properties: { field: { type: 'string' } } },
      requiredFields: ['field'],
      isTemplate: false,
      description: 'Test schema',
      extractionStrategy: null,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    };

    it('should populate form with existing schema data', () => {
      render(
        <SchemaForm
          schema={existingSchema}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Existing Schema')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test schema')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
    });

    it('should disable project selector in edit mode', () => {
      render(
        <SchemaForm
          schema={existingSchema}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      const projectSelect = screen.getByLabelText(/Project/i);
      expect(projectSelect).toBeDisabled();
    });
  });

  describe('Editor mode toggle', () => {
    it('should show both visual and code editor buttons', () => {
      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Visual Builder/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Code Editor/i })).toBeInTheDocument();
    });

    it('should switch to visual builder mode', async () => {
      const user = userEvent.setup();

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /Visual Builder/i }));

      expect(screen.getByText(/Properties \(0\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Property/i })).toBeInTheDocument();
    });
  });

  describe('JSON validation', () => {
    it('should show error for invalid JSON', async () => {
      const user = userEvent.setup();

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to code editor
      await user.click(screen.getByRole('button', { name: /Code Editor/i }));

      // Find the textarea and type invalid JSON
      const textarea = screen.getByPlaceholderText(/JSON Schema/i);
      await user.clear(textarea);
      await user.type(textarea, '{ invalid json }');

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
      });
    });

    it('should disable submit with invalid JSON', async () => {
      const user = userEvent.setup();

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      // Type invalid JSON
      const textarea = screen.getByPlaceholderText(/JSON Schema/i);
      await user.clear(textarea);
      await user.type(textarea, '{ invalid }');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Template selection', () => {
    const mockTemplates: Schema[] = [
      {
        id: 1,
        name: 'Invoice Template',
        projectId: 0,
        jsonSchema: {
          type: 'object',
          properties: {
            invoice_number: { type: 'string' },
            total: { type: 'number' },
          },
          required: ['invoice_number'],
        },
        requiredFields: ['invoice_number'],
        isTemplate: true,
        description: 'Invoice template',
        extractionStrategy: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ];

    it('should show template selector when templates are available', () => {
      render(
        <SchemaForm
          templates={mockTemplates}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/Start from Template/i)).toBeInTheDocument();
    });

    it('should populate form when template is selected', async () => {
      const user = userEvent.setup();

      render(
        <SchemaForm
          templates={mockTemplates}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      const templateSelect = screen.getByLabelText(/Start from Template/i);
      await user.selectOptions(templateSelect, '1');

      await waitFor(() => {
        // Verify template schema is loaded
        const textarea = screen.getByPlaceholderText(/JSON Schema/i);
        expect(textarea).toHaveValue(
          JSON.stringify(mockTemplates[0].jsonSchema, null, 2)
        );
      });
    });
  });
});
