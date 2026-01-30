import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/tests/utils';
import { ManifestBatchScopeModal } from './ManifestBatchScopeModal';
import type { Manifest } from '@/api/manifests';

const mockListManifestIds = vi.fn();

vi.mock('@/api/manifests', async () => {
  const actual = await vi.importActual<typeof import('@/api/manifests')>('@/api/manifests');
  return {
    ...actual,
    manifestsApi: {
      ...actual.manifestsApi,
      listManifestIds: (...args: unknown[]) => mockListManifestIds(...args),
    },
  };
});

describe('ManifestBatchScopeModal', () => {
  beforeEach(() => {
    mockListManifestIds.mockReset();
  });

  it('defaults scope to selected when there is selection', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    mockListManifestIds.mockResolvedValue({
      total: 2,
      ids: [10, 11],
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
      expect(mockListManifestIds).toHaveBeenCalled();
    });

    expect(screen.getByRole('radio', { name: /selected/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /all matching current filters/i }));
    expect(screen.getByRole('radio', { name: /all matching current filters/i })).toBeChecked();
  });

  it('disables selected scope when there is no selection', async () => {
    mockListManifestIds.mockResolvedValue({
      total: 0,
      ids: [],
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
      expect(mockListManifestIds).toHaveBeenCalled();
    });

    expect(screen.getByRole('radio', { name: /selected/i })).toBeDisabled();
  });

  it('passes selected export format to onStart', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onStart = vi.fn().mockResolvedValue(undefined);

    mockListManifestIds.mockResolvedValue({
      total: 1,
      ids: [10],
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
      expect(mockListManifestIds).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('radio', { name: /excel/i }));
    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(onStart).toHaveBeenCalledWith([10], 'filtered', 'xlsx');
  });

  it('fetches filtered scope using provided filters and sort', async () => {
    mockListManifestIds.mockResolvedValue({
      total: 1,
      ids: [10],
    });

    const filters = {
      status: 'completed',
      dynamicFilters: [{ field: 'invoice.po_no', value: '000' }],
    } as any;
    const sort = { field: 'createdAt', order: 'desc' } as any;

    renderWithProviders(
      <ManifestBatchScopeModal
        open={true}
        onClose={() => {}}
        title="Export"
        subtitle="Export manifests."
        startLabel="Export"
        groupId={1}
        filters={filters}
        sort={sort}
        selectedManifests={[]}
        onStart={async () => {}}
      />,
    );

    await waitFor(() => {
      expect(mockListManifestIds).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          filters,
          sort,
        }),
      );
    });
  });
});
