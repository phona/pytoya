import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/tests/utils';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AuditPanel } from './AuditPanel';

const updateManifestMutateAsync = vi.hoisted(() => vi.fn());
const runValidationMutateAsync = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const manifest = vi.hoisted(
  () =>
    ({
      id: 1,
      status: 'completed',
      originalFilename: 'invoice.pdf',
      storagePath: '/invoice.pdf',
      extractedData: { invoice: { po_no: '0000001' } },
      humanVerified: false,
      validationResults: null,
    }) as any,
);

vi.mock('@/shared/hooks/use-manifests', () => ({
  useManifest: () => ({ data: manifest, isLoading: false }),
  useUpdateManifest: () => ({ mutateAsync: updateManifestMutateAsync, isPending: false }),
  useManifestExtractionHistory: () => ({ data: [], isLoading: false }),
  useReExtractFieldPreview: () => ({ mutateAsync: vi.fn() }),
  useOcrResult: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('@/shared/hooks/use-websocket', () => ({
  useWebSocket: () => ({
    subscribeToManifest: vi.fn(),
    unsubscribeFromManifest: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-validation-scripts', () => ({
  useRunValidation: () => ({ mutateAsync: runValidationMutateAsync, isPending: false }),
}));

vi.mock('@/shared/hooks/use-extractors', () => ({
  useExtractors: () => ({ extractors: [] }),
}));

vi.mock('@/shared/hooks/use-projects', () => ({
  useProject: () => ({ project: { name: 'Project', defaultSchemaId: 1 } }),
  useGroups: () => ({ groups: [{ id: 1, name: 'Group' }] }),
}));

vi.mock('@/shared/hooks/use-schemas', () => ({
  useProjectSchemas: () => ({ schemas: [{ id: 1 }] }),
  useSchema: () => ({ schema: { jsonSchema: { type: 'object', properties: {} } } }),
}));

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/shared/hooks/use-modal-dialog', () => ({
  useModalDialog: () => ({ confirm: confirmMock, alert: vi.fn(), ModalDialog: () => null }),
}));

vi.mock('./PdfViewer', () => ({ PdfViewer: () => <div /> }));
vi.mock('./OcrViewer', () => ({ OcrViewer: () => <div /> }));
vi.mock('./ProgressBar', () => ({ ProgressBar: () => <div /> }));
vi.mock('./OcrPreviewModal', () => ({ OcrPreviewModal: () => null }));
vi.mock('./ExtractionHistoryPanel', () => ({ ExtractionHistoryPanel: () => <div /> }));
vi.mock('./FieldHintDialog', () => ({ FieldHintDialog: () => null }));
vi.mock('./AuditPanelFunctionsMenu', () => ({ AuditPanelFunctionsMenu: () => <div /> }));
vi.mock('@/shared/components/ValidationResultsPanel', () => ({ ValidationResultsPanel: () => <div /> }));
vi.mock('@/shared/components/CostBreakdownPanel', () => ({ CostBreakdownPanel: () => <div /> }));

vi.mock('./EditableForm', () => ({
  EditableForm: ({ onSave }: { onSave: (data: any) => void }) => (
    <button
      type="button"
      onClick={() => onSave({ extractedData: { invoice: { po_no: '0000001' } }, humanVerified: true })}
    >
      Mark Human Verified
    </button>
  ),
}));

describe('AuditPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateManifestMutateAsync.mockReset();
    runValidationMutateAsync.mockReset();
    confirmMock.mockReset();
    toastMock.mockReset();

    updateManifestMutateAsync.mockImplementation(async ({ data }: any) => ({
      ...manifest,
      ...data,
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('requires confirmation before saving Human Verified when validation has errors', async () => {
    runValidationMutateAsync.mockResolvedValue({
      issues: [],
      errorCount: 2,
      warningCount: 1,
      validatedAt: new Date().toISOString(),
    });
    confirmMock.mockResolvedValue(false);

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Human Verified' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.runAllTimersAsync();

    expect(updateManifestMutateAsync).toHaveBeenCalledTimes(1);
    expect(runValidationMutateAsync).toHaveBeenCalledWith({ manifestId: 1 });
    expect(confirmMock).toHaveBeenCalled();
  });

  it('saves Human Verified after confirmation when validation has errors', async () => {
    runValidationMutateAsync.mockResolvedValue({
      issues: [],
      errorCount: 1,
      warningCount: 0,
      validatedAt: new Date().toISOString(),
    });
    confirmMock.mockResolvedValue(true);

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Human Verified' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.runAllTimersAsync();

    expect(updateManifestMutateAsync).toHaveBeenCalledTimes(2);
    expect(updateManifestMutateAsync.mock.calls[1]?.[0]).toMatchObject({
      manifestId: 1,
      data: { humanVerified: true },
    });
  });

  it('navigates to previous/next manifests via router state', () => {
    const allManifestIds = [1, 2, 3];

    function LocationDisplay() {
      const location = useLocation();
      return <div data-testid="pathname">{location.pathname}</div>;
    }

    function AuditPanelRoute() {
      const params = useParams();
      const routeManifestId = Number(params.manifestId);
      return (
        <AuditPanel
          projectId={1}
          groupId={1}
          manifestId={routeManifestId}
          onClose={vi.fn()}
          allManifestIds={allManifestIds}
        />
      );
    }

    renderWithProviders(
      <>
        <Routes>
          <Route path="/projects/1/groups/1/manifests/:manifestId" element={<AuditPanelRoute />} />
        </Routes>
        <LocationDisplay />
      </>,
      { route: '/projects/1/groups/1/manifests/2' },
    );

    expect(screen.getByTestId('pathname')).toHaveTextContent('/projects/1/groups/1/manifests/2');

    fireEvent.click(screen.getByTitle('Next (→)'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/projects/1/groups/1/manifests/3');

    fireEvent.click(screen.getByTitle('Previous (←)'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/projects/1/groups/1/manifests/2');
  });
});
