import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, userEvent } from '@/tests/utils';
import { ManifestTable } from './ManifestTable';
import type { Manifest } from '@/api/manifests';
import type { ManifestTableSchemaColumn } from './ManifestTable';

const manifests = [
  {
    id: 1,
    originalFilename: 'invoice1.pdf',
    status: 'completed',
    extractedData: {
      invoice: { po_no: '0000001' },
      department: { code: 'IT' },
    },
    confidence: 0.95,
    humanVerified: true,
  },
  {
    id: 2,
    originalFilename: 'invoice2.pdf',
    status: 'pending',
    extractedData: null,
    confidence: null,
    humanVerified: false,
  },
  {
    id: 3,
    originalFilename: 'invoice3.pdf',
    status: 'failed',
    extractedData: {
      invoice: { po_no: '0000009' },
      department: { code: 'FIN' },
    },
    confidence: null,
    humanVerified: false,
  },
] as unknown as Manifest[];

const schemaColumns: ManifestTableSchemaColumn[] = [
  { path: 'invoice.po_no', title: 'PO #' },
  { path: 'department.code', title: 'Dept' },
];

const renderTable = (overrides: Partial<React.ComponentProps<typeof ManifestTable>> = {}) => {
  const onSortChange = vi.fn();
  const onSelectManifest = vi.fn();
  const onPreviewOcr = vi.fn();
  const onSchemaColumnFilterChange = vi.fn();
  const onFiltersChange = vi.fn();

  renderWithProviders(
    <ManifestTable
      manifests={manifests}
      sort={{ field: '', order: 'asc' }}
      onSortChange={onSortChange}
      onSelectManifest={onSelectManifest}
      filters={{}}
      onFiltersChange={onFiltersChange}
      onPreviewOcr={onPreviewOcr}
      schemaColumns={schemaColumns}
      schemaColumnFilters={{}}
      onSchemaColumnFilterChange={onSchemaColumnFilterChange}
      {...overrides}
    />,
  );

  return { onSortChange, onSelectManifest, onPreviewOcr, onSchemaColumnFilterChange, onFiltersChange };
};

describe('ManifestTable Integration Tests', () => {
  it('prefers live websocket status for Status badge', () => {
    renderTable({
      manifestProgress: {
        2: { progress: 10, status: 'active' },
      },
    });

    const pendingRow = screen.getByText('invoice2.pdf').closest('tr');
    expect(pendingRow).toBeTruthy();
    expect(within(pendingRow!).getByText('Processing')).toBeInTheDocument();
  });

  it('renders schema-driven columns', () => {
    renderTable();

    expect(screen.getByText('PO #')).toBeInTheDocument();
    expect(screen.getByText('Dept')).toBeInTheDocument();

    const row1 = screen.getByText('invoice1.pdf').closest('tr');
    expect(row1).toBeTruthy();
    expect(within(row1!).getByText('0000001')).toBeInTheDocument();
    expect(within(row1!).getByText('IT')).toBeInTheDocument();

    const row3 = screen.getByText('invoice3.pdf').closest('tr');
    expect(row3).toBeTruthy();
    expect(within(row3!).getByText('0000009')).toBeInTheDocument();
    expect(within(row3!).getByText('FIN')).toBeInTheDocument();
  });

  it('renders actions menu items by status', async () => {
    renderTable();
    const user = userEvent.setup();

    const pendingRow = screen.getByText('invoice2.pdf').closest('tr');
    expect(pendingRow).toBeTruthy();

    await user.click(within(pendingRow!).getByTitle('Actions'));
    const pendingMenu = document.getElementById('manifest-actions-menu-2');
    if (!pendingMenu) {
      throw new Error('Expected manifest actions menu for manifest 2 to be present');
    }
    expect(within(pendingMenu).getByText('Preview OCR')).toBeInTheDocument();
    expect(within(pendingMenu).getByText('Extract')).toBeInTheDocument();
    expect(within(pendingMenu).queryByText('Re-extract')).not.toBeInTheDocument();
    expect(within(pendingMenu).getByText('Run validation')).toBeInTheDocument();
    await user.click(document.body);

    const completedRow = screen.getByText('invoice1.pdf').closest('tr');
    expect(completedRow).toBeTruthy();

    await user.click(within(completedRow!).getByTitle('Actions'));
    const completedMenu = document.getElementById('manifest-actions-menu-1');
    if (!completedMenu) {
      throw new Error('Expected manifest actions menu for manifest 1 to be present');
    }
    expect(within(completedMenu).getByText('Preview OCR')).toBeInTheDocument();
    expect(within(completedMenu).getByText('Re-extract')).toBeInTheDocument();
    expect(within(completedMenu).queryByText('Extract')).not.toBeInTheDocument();
    expect(within(completedMenu).getByText('Run validation')).toBeInTheDocument();
  });

  it('calls onSelectManifest when Filename is clicked', () => {
    const { onSelectManifest } = renderTable();

    const row = screen.getByText('invoice1.pdf').closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(within(row!).getByRole('button', { name: 'invoice1.pdf' }));
    expect(onSelectManifest).toHaveBeenCalledWith(1);
  });

  it('calls onSortChange when header is clicked', () => {
    const { onSortChange } = renderTable();

    fireEvent.click(screen.getByText('Filename'));
    expect(onSortChange).toHaveBeenCalledWith({ field: 'filename', order: 'asc' });
  });

  it('calls onSortChange when schema header is clicked', () => {
    const { onSortChange } = renderTable();

    fireEvent.click(screen.getByText('PO #'));
    expect(onSortChange).toHaveBeenCalledWith({ field: 'invoice.po_no', order: 'asc' });
  });

  it('calls onSchemaColumnFilterChange when schema filter input changes', async () => {
    const { onSchemaColumnFilterChange } = renderTable();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Filter PO #' }));

    fireEvent.change(screen.getByLabelText('Field value: PO #'), {
      target: { value: '0000' },
    });
    expect(onSchemaColumnFilterChange).toHaveBeenCalledWith('invoice.po_no', '0000');
  });

  it('renders available values in the schema filter dropdown', async () => {
    renderTable();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Filter PO #' }));
    const popover = screen.getByRole('dialog');
    expect(within(popover).getByText('0000001')).toBeInTheDocument();
    expect(within(popover).getByText('0000009')).toBeInTheDocument();
  });

  it('respects columnVisibility state', () => {
    renderTable({
      columnVisibility: {
        status: false,
        'invoice.po_no': false,
      },
    });

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('PO #')).not.toBeInTheDocument();
  });
});
