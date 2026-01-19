import { act, renderWithProviders, screen, fireEvent, waitFor } from '@/tests/utils';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, it, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { server } from '@/tests/mocks/server';
import { ManifestsPage } from '@/routes/dashboard/ManifestsPage';

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
  AuditPanel: () => <div>Audit Content</div>,
}));

vi.mock('@/shared/components/UploadDialog', () => ({
  UploadDialog: () => <div>Upload Dialog</div>,
}));

const manifests = [
  {
    id: 201,
    groupId: 2,
    filename: 'invoice-a.pdf',
    originalFilename: 'invoice-a.pdf',
    status: 'completed',
    purchaseOrder: '0000009',
    department: 'Finance',
    invoiceDate: '2025-01-15T00:00:00.000Z',
    confidence: 0.95,
    humanVerified: false,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 202,
    groupId: 2,
    filename: 'invoice-b.pdf',
    originalFilename: 'invoice-b.pdf',
    status: 'completed',
    purchaseOrder: '1111111',
    department: 'Ops',
    invoiceDate: '2025-01-16T00:00:00.000Z',
    confidence: 0.88,
    humanVerified: false,
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2025-01-16T00:00:00.000Z',
  },
];

const setupHandlers = () => {
  server.use(
    http.get('/api/groups/2/manifests', ({ request }) => {
      const url = new URL(request.url);
      const filterValue = url.searchParams.get('filter[invoice.po_no]');
      const data = filterValue
        ? manifests.filter((item) => item.purchaseOrder === filterValue)
        : manifests;

      return HttpResponse.json({
        data,
        meta: {
          total: data.length,
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: Number(url.searchParams.get('pageSize') ?? 25),
          totalPages: data.length > 0 ? 1 : 0,
        },
      });
    }),
  );
};

describe('ManifestsPage dynamic filtering', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('filters manifests via dynamic field input', async () => {
    setupHandlers();

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route path="/projects/:id/groups/:groupId/manifests" element={<ManifestsPage />} />
        </Routes>,
        { route: '/projects/1/groups/2/manifests' },
      );
    });

    await screen.findByText('invoice-a.pdf');
    await screen.findByText('invoice-b.pdf');

    fireEvent.change(screen.getByLabelText('Field path'), {
      target: { value: 'invoice.po_no' },
    });
    fireEvent.change(screen.getByLabelText('Field value'), {
      target: { value: '0000009' },
    });
    fireEvent.click(screen.getByText('Add Field Filter'));

    await waitFor(() => {
      expect(screen.getByText('invoice-a.pdf')).toBeInTheDocument();
      expect(screen.queryByText('invoice-b.pdf')).not.toBeInTheDocument();
    });
  });
});




