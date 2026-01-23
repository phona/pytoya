import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/tests/utils';
import { useJobsStore } from '@/shared/stores/jobs';
import { ExtractFilteredModal } from './ExtractFilteredModal';

const mockExtractBulk = vi.fn();
const mockExtractFiltered = vi.fn();

vi.mock('@/api/manifests', () => ({
  manifestsApi: {
    extractBulk: (...args: unknown[]) => mockExtractBulk(...args),
    extractFiltered: (...args: unknown[]) => mockExtractFiltered(...args),
    extractManifest: vi.fn(),
    listManifests: vi.fn(),
    getManifest: vi.fn(),
    getExtractionHistory: vi.fn(),
    getExtractionHistoryEntry: vi.fn(),
    getPdfFileUrl: vi.fn(),
    getPdfFileBlob: vi.fn(),
    triggerOcr: vi.fn(),
    triggerExtraction: vi.fn(),
    getOcrResult: vi.fn(),
    reExtractField: vi.fn(),
    reExtractFieldWithPreview: vi.fn(),
    exportToCsv: vi.fn(),
    exportSelectedToCsv: vi.fn(),
  },
}));

vi.mock('@/shared/hooks/use-extractors', () => ({
  useExtractors: () => ({
    extractors: [{ id: 'ext-1', name: 'Extractor 1', extractorType: 'test', config: {}, isActive: true }],
    isLoading: false,
    error: null,
  }),
}));

describe('ExtractFilteredModal', () => {
  beforeEach(() => {
    mockExtractBulk.mockReset();
    mockExtractFiltered.mockReset();
    useJobsStore.getState().reset();
  });

  it('runs selected extraction via bulk extract and seeds jobs', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    mockExtractBulk.mockResolvedValue({
      jobId: 'batch_1',
      jobIds: ['job-1', 'job-2'],
      jobs: [
        { jobId: 'job-1', manifestId: 1 },
        { jobId: 'job-2', manifestId: 2 },
      ],
      manifestCount: 2,
    });

    renderWithProviders(
      <ExtractFilteredModal
        open={true}
        onClose={() => {}}
        groupId={1}
        totalManifests={10}
        selectedManifestIds={[1, 2]}
        filters={{}}
        sort={{ field: 'filename', order: 'asc' }}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /selected/i }));

    await user.click(screen.getByRole('button', { name: /start extraction/i }));

    expect(mockExtractBulk).toHaveBeenCalledWith(
      expect.objectContaining({ manifestIds: [1, 2] }),
    );
    expect(useJobsStore.getState().jobs.map((j) => j.id).sort()).toEqual(['job-1', 'job-2']);
  });

  it('runs filtered extraction only on start', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    mockExtractFiltered.mockResolvedValueOnce({
      jobId: 'batch_1',
      jobIds: ['job-11', 'job-22'],
      jobs: [
        { jobId: 'job-11', manifestId: 11 },
        { jobId: 'job-22', manifestId: 22 },
      ],
      manifestCount: 2,
    });

    renderWithProviders(
      <ExtractFilteredModal
        open={true}
        onClose={() => {}}
        groupId={1}
        totalManifests={10}
        selectedManifestIds={[]}
        filters={{ status: 'pending' }}
        sort={{ field: 'filename', order: 'asc' }}
      />,
    );

    expect(mockExtractFiltered).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start extraction/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /start extraction/i }));

    await waitFor(() => {
      expect(mockExtractFiltered).toHaveBeenCalledTimes(1);
    });
    expect(mockExtractFiltered).toHaveBeenLastCalledWith(1, expect.any(Object));
    expect(useJobsStore.getState().jobs.map((j) => j.id).sort()).toEqual(['job-11', 'job-22']);
  });
});
