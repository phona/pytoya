import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, within } from '@/tests/utils';
import { ManifestTable } from './ManifestTable';
import type { Manifest } from '@/api/manifests';

const manifests = [
  {
    id: 1,
    originalFilename: 'invoice1.pdf',
    status: 'completed',
    ocrQualityScore: null,
    purchaseOrder: '0000001',
    department: 'IT',
    invoiceDate: '2024-01-15T00:00:00.000Z',
    confidence: 0.95,
    humanVerified: true,
  },
  {
    id: 2,
    originalFilename: 'invoice2.pdf',
    status: 'pending',
    ocrQualityScore: 90,
    purchaseOrder: null,
    department: null,
    invoiceDate: null,
    confidence: null,
    humanVerified: false,
  },
  {
    id: 3,
    originalFilename: 'invoice3.pdf',
    status: 'failed',
    ocrQualityScore: 65,
    purchaseOrder: null,
    department: null,
    invoiceDate: null,
    confidence: null,
    humanVerified: false,
  },
] as unknown as Manifest[];

const renderTable = (overrides: Partial<React.ComponentProps<typeof ManifestTable>> = {}) => {
  const onSortChange = vi.fn();
  const onSelectManifest = vi.fn();
  const onExtract = vi.fn();
  const onReExtract = vi.fn();
  const onPreviewOcr = vi.fn();

  renderWithProviders(
    <ManifestTable
      manifests={manifests}
      projectId={1}
      sort={{ field: '', order: 'asc' }}
      onSortChange={onSortChange}
      onSelectManifest={onSelectManifest}
      onExtract={onExtract}
      onReExtract={onReExtract}
      onPreviewOcr={onPreviewOcr}
      {...overrides}
    />,
  );

  return { onSortChange, onSelectManifest, onExtract, onReExtract, onPreviewOcr };
};

describe('ManifestTable Integration Tests', () => {
  it('renders text quality badges', () => {
    renderTable();

    const row1 = screen.getByText('invoice1.pdf').closest('tr');
    expect(row1).toBeTruthy();
    expect(within(row1!).getByText('N/A')).toBeInTheDocument();

    const row2 = screen.getByText('invoice2.pdf').closest('tr');
    expect(row2).toBeTruthy();
    expect(within(row2!).getByText('90%')).toBeInTheDocument();

    const row3 = screen.getByText('invoice3.pdf').closest('tr');
    expect(row3).toBeTruthy();
    expect(within(row3!).getByText('65%')).toBeInTheDocument();
  });

  it('renders action buttons by status', () => {
    renderTable();

    const pendingRow = screen.getByText('invoice2.pdf').closest('tr');
    expect(pendingRow).toBeTruthy();
    expect(within(pendingRow!).getByTitle('Preview Text')).toBeInTheDocument();
    expect(within(pendingRow!).getByTitle('Extract')).toBeInTheDocument();
    expect(within(pendingRow!).getByTitle('Extraction actions')).toBeInTheDocument();

    const completedRow = screen.getByText('invoice1.pdf').closest('tr');
    expect(completedRow).toBeTruthy();
    expect(within(completedRow!).getByTitle('Re-extract')).toBeInTheDocument();
    expect(within(completedRow!).getByTitle('Extraction actions')).toBeInTheDocument();
  });

  it('calls onSelectManifest when row is clicked', () => {
    const { onSelectManifest } = renderTable();

    fireEvent.click(screen.getByText('invoice1.pdf'));
    expect(onSelectManifest).toHaveBeenCalledWith(1);
  });

  it('calls onSortChange when header is clicked', () => {
    const { onSortChange } = renderTable();

    fireEvent.click(screen.getByText('Filename'));
    expect(onSortChange).toHaveBeenCalledWith({ field: 'filename', order: 'asc' });
  });
});
