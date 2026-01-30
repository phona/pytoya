import { act, renderWithProviders, screen, fireEvent, waitFor, within } from '@/tests/utils';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { server } from '@/tests/mocks/server';
import { ManifestsPage } from './ManifestsPage';
import { ManifestAuditPage } from './ManifestAuditPage';

vi.mock('@/shared/hooks/use-websocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
    isConnecting: false,
    subscribeToManifest: vi.fn(),
    unsubscribeFromManifest: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/shared/components/manifests/AuditPanel', () => ({
  AuditPanel: ({ onClose }: { onClose: () => void }) => (
    <div>
      <div>Audit Content</div>
      <button onClick={onClose}>Close Audit</button>
    </div>
  ),
}));

vi.mock('@/shared/components/UploadDialog', () => ({
  UploadDialog: () => <div>Upload Dialog</div>,
}));

const setupHandlers = () => {
  server.use(
    http.get('/api/groups/2/manifests', () =>
      HttpResponse.json({
        data: [
          {
            id: 101,
            groupId: 2,
            filename: 'invoice.pdf',
            originalFilename: 'invoice.pdf',
            status: 'completed',
            purchaseOrder: '0000009',
            department: 'Finance',
            invoiceDate: '2025-01-15T00:00:00.000Z',
            confidence: 0.95,
            humanVerified: false,
            createdAt: '2025-01-15T00:00:00.000Z',
            updatedAt: '2025-01-15T00:00:00.000Z',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        },
      }),
    ),
    http.get('/api/groups/2/manifests/ids', () =>
      HttpResponse.json({
        total: 1,
        ids: [101],
      }),
    ),
  );
};

describe('ManifestsPage', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('navigates to manifest audit page', async () => {
    setupHandlers();

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route path="/projects/:id/groups/:groupId/manifests" element={<ManifestsPage />} />
          <Route path="/projects/:id/groups/:groupId/manifests/:manifestId" element={<ManifestAuditPage />} />
        </Routes>,
        { route: '/projects/1/groups/2/manifests' },
      );
    });

    await screen.findByText('invoice.pdf');

    await act(async () => {
      const row = screen.getByText('invoice.pdf').closest('tr');
      expect(row).toBeTruthy();
      fireEvent.click(within(row!).getByRole('button', { name: 'invoice.pdf' }));
    });

    expect(screen.getByText('Audit Content')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Audit'));

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });
  });

  it('deletes manifests in bulk', async () => {
    setupHandlers();

    let bulkDeleteBody: unknown = null;
    server.use(
      http.post('/api/groups/:groupId/manifests/delete-bulk', async ({ request }) => {
        bulkDeleteBody = await request.json();
        return HttpResponse.json({ deletedCount: 1 });
      }),
    );

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route path="/projects/:id/groups/:groupId/manifests" element={<ManifestsPage />} />
        </Routes>,
        { route: '/projects/1/groups/2/manifests' },
      );
    });

    await screen.findByText('invoice.pdf');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select invoice.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete…' }));
    await screen.findByText('Delete manifests');

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    await waitFor(() => expect(deleteButton).toBeEnabled());

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(bulkDeleteBody).not.toBeNull();
    });

    expect(bulkDeleteBody).toEqual({ manifestIds: [101] });
  });

  it('exports selected manifests as Excel (.xlsx)', async () => {
    setupHandlers();

    if (!('createObjectURL' in window.URL)) {
      // jsdom doesn't always provide blob URL helpers
      (window.URL as any).createObjectURL = () => 'blob:mock';
    }
    if (!('revokeObjectURL' in window.URL)) {
      (window.URL as any).revokeObjectURL = () => {};
    }

    const createObjectUrlSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectUrlSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123);

    let exportBody: unknown = null;
    server.use(
      http.post('/api/manifests/export/xlsx', async ({ request }) => {
        exportBody = await request.json();
        return HttpResponse.arrayBuffer(new TextEncoder().encode('xlsx').buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        });
      }),
    );

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route path="/projects/:id/groups/:groupId/manifests" element={<ManifestsPage />} />
        </Routes>,
        { route: '/projects/1/groups/2/manifests' },
      );
    });

    await screen.findByText('invoice.pdf');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select invoice.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await screen.findByText('Export manifests');
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('radio', { name: /selected/i }));
    fireEvent.click(within(dialog).getByRole('radio', { name: /excel/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(exportBody).toEqual({ manifestIds: [101] });
    });

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

    const anchorCalls = appendSpy.mock.calls
      .map((call) => call[0])
      .filter((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    expect(anchorCalls.some((a) => a.download === 'manifests-export-123.xlsx')).toBe(true);

    nowSpy.mockRestore();
    appendSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });
});




