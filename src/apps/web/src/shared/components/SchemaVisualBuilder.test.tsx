import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SchemaVisualBuilder } from './SchemaVisualBuilder';

const click = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.click(element);
  });
};

const type = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) => {
  await act(async () => {
    await user.type(element, text);
  });
};

const clear = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.clear(element);
  });
};

const select = async (
  user: ReturnType<typeof userEvent.setup>,
  element: HTMLElement,
  value: string,
) => {
  await act(async () => {
    await user.selectOptions(element, value);
  });
};

describe('SchemaVisualBuilder', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render with properties count', () => {
      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              field1: { type: 'string' },
              field2: { type: 'number' },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Properties \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
    });

    it('should show add property button', () => {
      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: /Add Property/i })).toBeInTheDocument();
    });

    it('should show empty state when no properties', () => {
      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/No properties defined yet/i)).toBeInTheDocument();
    });
  });

  describe('Adding properties', () => {
    it('should show add form when clicking add property', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));

      await waitFor(() => {
        expect(screen.getByText(/Add New Property/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    });

    it('should add string property', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await type(user, screen.getByLabelText(/Name/i), 'testField');
      await click(user, screen.getByRole('button', { name: /^Add$/i }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should cancel adding property', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await click(user, screen.getByRole('button', { name: /Cancel/i }));

      expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument();
    });
  });

  describe('Property types', () => {
    it('should show all type options', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));

      const typeSelect = screen.getByLabelText(/Type/i);
      await click(user, typeSelect);

      await waitFor(() => {
        expect(screen.getByText('String')).toBeInTheDocument();
      });
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByText('Integer')).toBeInTheDocument();
      expect(screen.getByText('Boolean')).toBeInTheDocument();
      expect(screen.getByText('Object')).toBeInTheDocument();
      expect(screen.getByText('Array')).toBeInTheDocument();
    });
  });

  describe('String field constraints', () => {
    it('should show format options for string type', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await select(user, screen.getByLabelText(/Type/i), 'string');

      expect(screen.getByLabelText(/Format/i)).toBeInTheDocument();
    });

    it('should show string format options', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await select(user, screen.getByLabelText(/Type/i), 'string');
      await click(user, screen.getByLabelText(/Format/i));

      expect(screen.getByText(/Date \(YYYY-MM-DD\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Email/i)).toBeInTheDocument();
      expect(screen.getByText(/URI/i)).toBeInTheDocument();
      expect(screen.getByText(/UUID/i)).toBeInTheDocument();
    });

    it('should show pattern field for string type', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await select(user, screen.getByLabelText(/Type/i), 'string');

      expect(screen.getByLabelText(/Pattern/i)).toBeInTheDocument();
    });
  });

  describe('Number/Integer constraints', () => {
    it('should show min/max for number type', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await select(user, screen.getByLabelText(/Type/i), 'number');

      expect(screen.getByLabelText(/Minimum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Maximum/i)).toBeInTheDocument();
    });

    it('should show min/max for integer type', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await select(user, screen.getByLabelText(/Type/i), 'integer');

      expect(screen.getByLabelText(/Minimum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Maximum/i)).toBeInTheDocument();
    });
  });

  describe('Required field', () => {
    it('should show required checkbox', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));

      expect(screen.getByLabelText(/Required field/i)).toBeInTheDocument();
    });

    it('should mark property as required', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await type(user, screen.getByLabelText(/Name/i), 'requiredField');
      await click(user, screen.getByLabelText(/Required field/i));
      await click(user, screen.getByRole('button', { name: /^Add$/i }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            required: expect.arrayContaining(['requiredField']),
          })
        );
      });
    });
  });

  describe('Editing properties', () => {
    it('should show edit form when clicking edit', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              existingField: { type: 'string' },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByTitle(/Edit/i));

      expect(screen.getByText(/Edit Property/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('existingField')).toBeInTheDocument();
    });

    it('should update property', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              field: { type: 'string' },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByTitle(/Edit/i));
      await clear(user, screen.getByLabelText(/Name/i));
      await type(user, screen.getByLabelText(/Name/i), 'updatedField');
      await click(user, screen.getByRole('button', { name: /Update/i }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should cancel edit', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              field: { type: 'string' },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByTitle(/Edit/i));
      await click(user, screen.getByRole('button', { name: /Cancel/i }));

      expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument();
    });
  });

  describe('Deleting properties', () => {
    it('should delete property', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              field1: { type: 'string' },
              field2: { type: 'number' },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getAllByTitle(/Delete/i)[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Property display', () => {
    it('should display property with type badge', () => {
      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              myField: { type: 'string' },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('myField')).toBeInTheDocument();
      expect(screen.getByText('string')).toBeInTheDocument();
    });

    it('should display required badge for required fields', () => {
      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              requiredField: { type: 'string' },
            },
            required: ['requiredField'],
          }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('required')).toBeInTheDocument();
      expect(screen.getByText('required')).toHaveClass('text-destructive');
    });

    it('should display description', () => {
      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              field: {
                type: 'string',
                description: 'Field description',
              },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Field description')).toBeInTheDocument();
    });

    it('should display format badge', () => {
      render(
        <SchemaVisualBuilder
          schema={{
            type: 'object',
            properties: {
              email: {
                type: 'string',
                format: 'email',
              },
            },
            required: [],
          }}
          onChange={mockOnChange}
        />
      );

      const emailBadges = screen.getAllByText('email', { selector: 'span' });
      const formatBadge = emailBadges.find((badge) =>
        badge.className.includes('status-processing-text'),
      );

      expect(formatBadge).toBeDefined();
      expect(formatBadge).toHaveClass('text-[color:var(--status-processing-text)]');
    });
  });

  describe('Enum support', () => {
    it('should show enum field for string type', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await select(user, screen.getByLabelText(/Type/i), 'string');

      expect(screen.getByLabelText(/Enum/)).toBeInTheDocument();
    });

    it('should parse comma-separated enum values', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await type(user, screen.getByLabelText(/Name/i), 'status');
      await type(user, screen.getByLabelText(/Enum/i), 'active, inactive, pending');
      await click(user, screen.getByRole('button', { name: /^Add$/i }));

      await waitFor(() => {
        const call = mockOnChange.mock.calls[0][0];
        expect(call.properties.status.enum).toEqual(['active', 'inactive', 'pending']);
      });
    });
  });

  describe('Array type support', () => {
    it('should show array type option', async () => {
      const user = userEvent.setup();

      render(
        <SchemaVisualBuilder
          schema={{ type: 'object', properties: {} }}
          onChange={mockOnChange}
        />
      );

      await click(user, screen.getByRole('button', { name: /Add Property/i }));
      await click(user, screen.getByLabelText(/Type/i));

      expect(screen.getByText('Array')).toBeInTheDocument();
    });
  });
});




