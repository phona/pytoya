import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, within } from '@/tests/utils';
import type { Manifest } from '@/api/manifests';
import { ManifestList } from './ManifestList';

vi.mock('@/shared/hooks/use-websocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
    isConnecting: false,
    subscribeToManifest: vi.fn(),
    unsubscribeFromManifest: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-extractors', () => ({
  useExtractors: () => ({ extractors: [], isLoading: false, error: null }),
  useExtractorTypes: () => ({ types: [], isLoading: false, error: null }),
}));

vi.mock('@/shared/hooks/use-validation-scripts', () => ({
  useRunValidation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRunBatchValidation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('./ExtractFilteredModal', () => ({
  ExtractFilteredModal: () => null,
}));

describe('ManifestList', () => {
  it('hides default system columns until enabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    const manifests = [
      {
        id: 1,
        groupId: 1,
        filename: 'invoice1.pdf',
        originalFilename: 'invoice1.pdf',
        storagePath: '/tmp/invoice1.pdf',
        fileSize: 1024,
        fileType: 'pdf',
        status: 'completed',
        extractedData: null,
        confidence: 0.9,
        humanVerified: false,
        purchaseOrder: null,
        invoiceDate: null,
        department: null,
        validationResults: null,
        ocrResult: null,
        ocrProcessedAt: null,
        ocrQualityScore: null,
        extractionCost: null,
        textCost: null,
        llmCost: null,
        extractionCostCurrency: null,
        textExtractorId: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ] as unknown as Manifest[];

    renderWithProviders(
      <ManifestList
        groupId={1}
        manifests={manifests}
        totalManifests={1}
        filters={{}}
        onFiltersChange={() => {}}
        sort={{ field: 'filename', order: 'asc' }}
        viewMode="table"
        onViewModeChange={() => {}}
        onSortChange={() => {}}
        onSelectManifest={() => {}}
        currentPage={1}
        pageSize={25}
        totalPages={1}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );

    const getTable = () => screen.getByRole('table');
    expect(within(getTable()).queryByText('OCR Quality')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'OCR Quality' })).toBeInTheDocument();
  });
});
