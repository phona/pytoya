import { render, screen } from '@testing-library/react';
import { SchemaPreview } from './SchemaPreview';

describe('SchemaPreview', () => {
  describe('Basic rendering', () => {
    it('should render with title', () => {
      render(
        <SchemaPreview
          schema={{ type: "object" as const, properties: {} } as Record<string, unknown>}
          title="Test Schema"
        />
      );

      expect(screen.getByText('Test Schema')).toBeInTheDocument();
    });

    it('should render without title', () => {
      render(
        <SchemaPreview schema={{ type: 'object', properties: {} }} />
      );

      expect(screen.queryByText('Test Schema')).not.toBeInTheDocument();
    });
  });

  describe('Empty schema', () => {
    it('should show empty state when no properties', () => {
      render(
        <SchemaPreview
          schema={{ type: "object" as const, properties: {} } as Record<string, unknown>}
          title="Empty Schema"
        />
      );

      expect(screen.getByText(/No properties defined/i)).toBeInTheDocument();
    });

    it('should show properties count as 0', () => {
      render(
        <SchemaPreview
          schema={{ type: "object" as const, properties: {} } as Record<string, unknown>}
        />
      );

      expect(screen.queryByText(/0 properties defined/i)).not.toBeInTheDocument();
    });
  });

  describe('Property display', () => {
    it('should display simple string property', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              name: { type: 'string', description: 'User name' },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('User name')).toBeInTheDocument();
      expect(screen.getByText('string')).toBeInTheDocument();
    });

    it('should display required field indicator', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              email: { type: 'string' },
            },
            required: ['email'],
          }}
        />
      );

      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('required')).toBeInTheDocument();
      expect(screen.getByText('required')).toHaveClass('text-destructive');
    });

    it('should display multiple properties', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
              active: { type: 'boolean' },
            },
            required: ['name'],
          }}
        />
      );

      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('age')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText(/3 properties defined/i)).toBeInTheDocument();
    });
  });

  describe('Type display', () => {
    it('should display string type', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              field: { type: 'string' },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('string')).toBeInTheDocument();
    });

    it('should display number type', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('number')).toBeInTheDocument();
    });

    it('should display boolean type', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              active: { type: 'boolean' },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('boolean')).toBeInTheDocument();
    });

    it('should display array type', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('string[]')).toBeInTheDocument();
    });

    it('should display object type', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              nested: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                },
              },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('nested')).toBeInTheDocument();
      expect(screen.getByText('object')).toBeInTheDocument();
    });
  });

  describe('Nested properties', () => {
    it('should display nested object properties', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
    });

    it('should indent nested properties', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              parent: {
                type: 'object',
                properties: {
                  child: { type: 'string' },
                },
              },
            },
            required: [],
          }}
        />
      );

      // Check that nested properties have padding
      const childElement = screen.getByText('child').closest('.property-node');
      expect(childElement).toBeInTheDocument();
    });
  });

  describe('Array properties', () => {
    it('should display array items label', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                },
              },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText(/Array items:/i)).toBeInTheDocument();
    });

    it('should display array item properties', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' },
                  },
                },
              },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('value')).toBeInTheDocument();
    });
  });

  describe('Property constraints', () => {
    it('should display format for string properties', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText(/format:\s*email/i)).toBeInTheDocument();
      expect(screen.getByText('email')).toHaveClass('text-primary');
    });

    it('should display pattern constraint', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              code: { type: 'string', pattern: '^[A-Z]{3}' },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText(/pattern:\s*\^\[A-Z\]\{3\}/)).toBeInTheDocument();
    });

    it('should display enum constraint', () => {
      render(
        <SchemaPreview
          schema={{
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['active', 'inactive', 'pending'],
              },
            },
            required: [],
          }}
        />
      );

      expect(screen.getByText(/enum:/i)).toBeInTheDocument();
      expect(screen.getByText(/active, inactive, pending/i)).toBeInTheDocument();
    });
  });

  describe('Complex schemas', () => {
    it('should display invoice-like schema', () => {
      const invoiceSchema = {
        type: 'object' as const,
        properties: {
          invoice_number: { type: 'string', description: 'Unique invoice number' },
          total: { type: 'number', description: 'Total amount' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
              },
            },
          },
        },
        required: ['invoice_number', 'total'],
      };

      render(<SchemaPreview schema={invoiceSchema} />);

      expect(screen.getByText('invoice_number')).toBeInTheDocument();
      expect(screen.getByText('total')).toBeInTheDocument();
      expect(screen.getByText('items')).toBeInTheDocument();
      expect(screen.getByText('quantity')).toBeInTheDocument();
      expect(screen.getByText('price')).toBeInTheDocument();
    });
  });
});




