import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@/tests/utils';
import type { Manifest } from '@/api/manifests';
import { SchemaTestMode } from './SchemaTestMode';

let mockState = {
  schemaTestMode: false,
  setSchemaTestMode: vi.fn(),
};

vi.mock('@/shared/stores/extraction', () => ({
  useExtractionStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

const buildManifest = (overrides?: Partial<Manifest>): Manifest => ({
  id: 1,
  filename: 'invoice-001.pdf',
  originalFilename: 'invoice-001.pdf',
  storagePath: '/uploads/invoice-001.pdf',
  fileSize: 1024,
  fileType: 'pdf' as Manifest['fileType'],
  status: 'completed' as Manifest['status'],
  groupId: 1,
  extractedData: null,
  confidence: null,
  purchaseOrder: null,
  invoiceDate: null,
  department: null,
  humanVerified: false,
  validationResults: null,
  ocrResult: null,
  ocrProcessedAt: null,
  ocrQualityScore: null,
  extractionCost: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('SchemaTestMode', () => {
  beforeEach(() => {
    mockState = {
      schemaTestMode: false,
      setSchemaTestMode: vi.fn(),
    };
  });

  it('shows entry button when test mode is disabled', () => {
    render(
      <SchemaTestMode
        manifests={[buildManifest()]}
        selectedIds={new Set()}
        onSelectToggle={vi.fn()}
        onExtractSelected={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Test Mode/i })).toBeInTheDocument();
  });

  it('enables test mode when button is clicked', () => {
    render(
      <SchemaTestMode
        manifests={[buildManifest()]}
        selectedIds={new Set()}
        onSelectToggle={vi.fn()}
        onExtractSelected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Test Mode/i }));
    expect(mockState.setSchemaTestMode).toHaveBeenCalledWith(true);
  });

  it('renders test mode view when enabled', () => {
    mockState = {
      schemaTestMode: true,
      setSchemaTestMode: vi.fn(),
    };

    render(
      <SchemaTestMode
        manifests={[buildManifest({ extractedData: { invoice: { po_no: '0000001' } } })]}
        selectedIds={new Set()}
        onSelectToggle={vi.fn()}
        onExtractSelected={vi.fn()}
      />,
    );

    expect(screen.getByText('Schema Test Mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exit Test Mode/i })).toBeInTheDocument();
  });
});
