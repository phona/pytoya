import { describe, expect, it, vi } from 'vitest';
import { screen } from '@/tests/utils';
import { renderWithProviders } from '@/tests/utils';
import { EditableForm } from './EditableForm';
import type { Manifest } from '@/api/manifests';

describe('EditableForm', () => {
  it('renders x-extraction-hint helper text when provided', () => {
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
        items={[]}
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
});

