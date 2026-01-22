import { describe, expect, it, vi } from 'vitest';
import { screen, userEvent, waitFor } from '@/tests/utils';
import { renderWithProviders } from '@/tests/utils';
import { EditableForm } from './EditableForm';
import type { Manifest } from '@/api/manifests';
import { deriveExtractionHintMap } from '@/shared/utils/schema';

describe('EditableForm', () => {
  it('renders x-extraction-hint helper text when provided', () => {
    const schema = {
      type: 'object',
      properties: {
        department: {
          type: 'object',
          properties: {
            code: { type: 'string', title: 'Department Code' },
          },
        },
        invoice: {
          type: 'object',
          properties: {
            po_no: { type: 'string', title: 'PO Number' },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const manifest = {
      id: 1,
      extractedData: {
        department: { code: '' },
        invoice: { po_no: '', invoice_date: '', usage: '' },
        items: [],
      },
      humanVerified: false,
    } as unknown as Manifest;

    renderWithProviders(
      <EditableForm
        manifest={manifest}
        jsonSchema={schema}
        extractionHintMap={{
          'department.code': 'Choose from the invoice header block',
          'invoice.po_no': '7 digits, zero-padded',
        }}
        onSave={vi.fn()}
        onReExtractField={vi.fn()}
      />,
    );

    expect(screen.getByText('hint: Choose from the invoice header block')).toBeInTheDocument();
    expect(screen.getByText('hint: 7 digits, zero-padded')).toBeInTheDocument();
  });

  it('renders schema-driven fields (including newly-added fields)', async () => {
    const schema = {
      type: 'object',
      properties: {
        invoice: {
          type: 'object',
          title: 'Invoice',
          properties: {
            po_no: {
              type: 'string',
              title: 'PO Number',
              'x-extraction-hint': 'Top right, 7 digits',
            },
            total_amount: {
              type: 'number',
              title: 'Total Amount',
              'x-extraction-hint': 'Sum of all line totals',
            },
          },
        },
        items: {
          type: 'array',
          title: 'Line Items',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', title: 'Description' },
              quantity: { type: 'number', title: 'Quantity' },
            },
          },
        },
        department: {
          type: 'object',
          properties: {
            code: { type: 'string', title: 'Department Code' },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const manifest = {
      id: 1,
      extractedData: {
        invoice: { po_no: '0000001', total_amount: 10.5 },
        items: [{ description: 'Widget', quantity: 1 }],
      },
      humanVerified: false,
    } as unknown as Manifest;

    const onSave = vi.fn();

    renderWithProviders(
      <EditableForm
        manifest={manifest}
        jsonSchema={schema}
        extractionHintMap={deriveExtractionHintMap(schema)}
        onSave={onSave}
        onReExtractField={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('PO Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();

    expect(screen.getByText('hint: Top right, 7 digits')).toBeInTheDocument();
    expect(screen.getByText('hint: Sum of all line totals')).toBeInTheDocument();

    const totalAmountInput = screen.getByLabelText('Total Amount');
    await userEvent.clear(totalAmountInput);
    await userEvent.type(totalAmountInput, '123.45');

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });

    const lastCall = onSave.mock.calls.at(-1)?.[0] as Partial<Manifest> | undefined;
    expect(lastCall?.extractedData).toMatchObject({
      invoice: { po_no: '0000001', total_amount: 123.45 },
    });
  });
});
