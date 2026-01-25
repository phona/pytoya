import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/tests/utils';
import { ManifestBatchScopeModal } from './ManifestBatchScopeModal';
import type { Manifest } from '@/api/manifests';

const mockListManifests = vi.fn();

vi.mock('@/api/manifests', async () => {
  const actual = await vi.importActual<typeof import('@/api/manifests')>('@/api/manifests');
  return {
    ...actual,
    manifestsApi: {
      ...actual.manifestsApi,
      listManifests: (...args: unknown[]) => mockListManifests(...args),
    },
  };
});

describe('ManifestBatchScopeModal', () => {
  beforeEach(() => {
    mockListManifests.mockReset();
  });

  it('defaults scope to filtered even when there is selection', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    mockListManifests.mockResolvedValue({
      data: [
        { id: 10, status: 'completed', extractedData: { ok: true } },
        { id: 11, status: 'pending', extractedData: null },
      ],
      meta: { total: 2, page: 1, pageSize: 200, totalPages: 1 },
    });

    renderWithProviders(
      <ManifestBatchScopeModal
        open={true}
        onClose={() => {}}
        title="Export CSV"
        subtitle="Export manifests."
        startLabel="Export CSV"
        groupId={1}
        filters={{}}
        sort={{ field: 'filename', order: 'asc' }}
        selectedManifests={[{ id: 99, status: 'completed', extractedData: { ok: true } } as unknown as Manifest]}
        onStart={async () => {}}
      />,
    );

    await waitFor(() => {
      expect(mockListManifests).toHaveBeenCalled();
    });

    expect(screen.getByRole('radio', { name: /all matching current filters/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /selected/i }));
    expect(screen.getByRole('radio', { name: /selected/i })).toBeChecked();
  });

  it('disables selected scope when there is no selection', async () => {
    mockListManifests.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 200, totalPages: 0 },
    });

    renderWithProviders(
      <ManifestBatchScopeModal
        open={true}
        onClose={() => {}}
        title="Run validation"
        subtitle="Validate manifests."
        startLabel="Run validation"
        groupId={1}
        filters={{}}
        sort={{ field: 'filename', order: 'asc' }}
        selectedManifests={[]}
        onStart={async () => {}}
      />,
    );

    await waitFor(() => {
      expect(mockListManifests).toHaveBeenCalled();
    });

    expect(screen.getByRole('radio', { name: /selected/i })).toBeDisabled();
  });

  it('passes selected export format to onStart', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onStart = vi.fn().mockResolvedValue(undefined);

    mockListManifests.mockResolvedValue({
      data: [
        { id: 10, status: 'completed', extractedData: { ok: true } },
      ],
      meta: { total: 1, page: 1, pageSize: 200, totalPages: 1 },
    });

    renderWithProviders(
      <ManifestBatchScopeModal
        open={true}
        onClose={() => {}}
        title="Export"
        subtitle="Export manifests."
        startLabel="Export"
        groupId={1}
        filters={{}}
        sort={{ field: 'filename', order: 'asc' }}
        selectedManifests={[]}
        formatOptions={{ defaultFormat: 'csv' }}
        onStart={onStart}
      />,
    );

    await waitFor(() => {
      expect(mockListManifests).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('radio', { name: /excel/i }));
    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(onStart).toHaveBeenCalledWith([10], 'filtered', 'xlsx');
  });
});
