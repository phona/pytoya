import { act, renderWithProviders, screen, fireEvent, waitFor, within } from '@/tests/utils';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, it, vi } from 'vitest';
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
});




