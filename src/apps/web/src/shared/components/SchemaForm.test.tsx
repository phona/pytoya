import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { SchemaForm } from './SchemaForm';
import { Schema, ExtractionStrategy } from '@/api/schemas';

// Mock the projects hook
vi.mock('@/shared/hooks/use-projects', () => ({
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

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

const click = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.click(element);
  });
};

const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
  optionText: string,
) => {
  await act(async () => {
    await user.click(screen.getByLabelText(label));
  });
  const listbox = await screen.findByRole('listbox');
  await act(async () => {
    const option = within(listbox).getByRole('option', { name: optionText });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
  });
  await waitFor(() => {
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
};

const clear = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.clear(element);
  });
};

describe('SchemaForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

      expect(screen.getByLabelText(/Project/i)).toBeInTheDocument();
      expect(screen.getByText(/^JSON Schema/i)).toBeInTheDocument();
    });

    it('should submit valid schema', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      await selectOption(user, /Project/i, 'Project 1');

      // Submit form
      await click(user, screen.getByRole('button', { name: /Create/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should cancel form submission', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      await click(user, screen.getByRole('button', { name: /Cancel/i }));

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
      description: 'Test schema',
      extractionStrategy: ExtractionStrategy.OCR_FIRST,
      systemPromptTemplate: null,
      validationSettings: null,
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
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      await click(user, screen.getByRole('button', { name: /Visual Builder/i }));

      expect(screen.getByText(/Properties \(0\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Property/i })).toBeInTheDocument();
    });
  });

  describe('JSON validation', () => {
    it('should show error for invalid JSON', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      // Switch to code editor
      await click(user, screen.getByRole('button', { name: /Code Editor/i }));

      // Find the textarea and type invalid JSON
      const textarea = screen.getByPlaceholderText(/"type": "object"/i);
      await clear(user, textarea);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '{ invalid json }' } });
      });

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText('Invalid JSON', { selector: 'span' })
        ).toBeInTheDocument();
      });
    });

    it('should disable submit with invalid JSON', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <SchemaForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper: createWrapper() }
      );

      // Type invalid JSON
      const textarea = screen.getByPlaceholderText(/"type": "object"/i);
      await clear(user, textarea);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '{ invalid }' } });
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

});




