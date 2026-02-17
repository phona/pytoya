import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { fireEvent, renderWithProviders, screen } from '@/tests/utils';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AuditPanel } from './AuditPanel';
import { useEffect, useState } from 'react';

const updateManifestMutateAsync = vi.hoisted(() => vi.fn());
const runValidationMutateAsync = vi.hoisted(() => vi.fn());
const queueOcrRefreshJobMutateAsync = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const webSocketOptionsRef = vi.hoisted(() => ({ current: null as any }));
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
  useManifestOcrHistory: () => ({ data: [], isLoading: false }),
  useReExtractField: () => ({ mutateAsync: vi.fn() }),
  useOcrResult: () => ({ data: null, isLoading: false, error: null }),
  useQueueOcrRefreshJob: () => ({ mutateAsync: queueOcrRefreshJobMutateAsync, isPending: false }),
}));

vi.mock('@/shared/hooks/use-websocket', () => ({
  useWebSocket: (options: any) => {
    webSocketOptionsRef.current = options;
    return {
    subscribeToManifest: vi.fn(),
    unsubscribeFromManifest: vi.fn(),
    };
  },
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
vi.mock('./OcrPreviewModal', () => ({ OcrPreviewModal: () => null }));
vi.mock('./ExtractionHistoryPanel', () => ({ ExtractionHistoryPanel: () => <div /> }));
vi.mock('./OcrHistoryPanel', () => ({ OcrHistoryPanel: () => <div /> }));
vi.mock('./FieldHintDialog', () => ({ FieldHintDialog: () => null }));
vi.mock('./AuditPanelFunctionsMenu', () => ({
  AuditPanelFunctionsMenu: ({ onTabChange }: { onTabChange: (tab: string) => void }) => (
    <div>
      <button type="button" onClick={() => onTabChange('ocr')}>OCR Tab</button>
    </div>
  ),
}));
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
    manifest.humanVerified = false;
    updateManifestMutateAsync.mockReset();
    runValidationMutateAsync.mockReset();
    queueOcrRefreshJobMutateAsync.mockReset();
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

  it('does not show storagePath in the header', () => {
    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    expect(screen.queryByText('/invoice.pdf')).not.toBeInTheDocument();
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

  it('runs validation on Save when manifest is already Human Verified', async () => {
    manifest.humanVerified = true;
    runValidationMutateAsync.mockResolvedValue({
      issues: [],
      errorCount: 0,
      warningCount: 0,
      validatedAt: new Date().toISOString(),
    });

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Human Verified' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.runAllTimersAsync();

    expect(runValidationMutateAsync).toHaveBeenCalledWith({ manifestId: 1 });
    expect(updateManifestMutateAsync).toHaveBeenCalledTimes(2);
    expect(updateManifestMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      manifestId: 1,
      data: { humanVerified: false },
    });
    expect(updateManifestMutateAsync.mock.calls[1]?.[0]).toMatchObject({
      manifestId: 1,
      data: { humanVerified: true },
    });
  });

  it('shows validation summary on Save when validation has warnings', async () => {
    runValidationMutateAsync.mockResolvedValue({
      issues: [],
      errorCount: 0,
      warningCount: 2,
      validatedAt: new Date().toISOString(),
    });

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Human Verified' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.runAllTimersAsync();

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation',
        description: '2 warnings',
      }),
    );
  });

  it('shows a retryable error when Save-triggered validation fails', async () => {
    runValidationMutateAsync.mockRejectedValue(new Error('Network down'));

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Human Verified' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.runAllTimersAsync();

    expect(updateManifestMutateAsync).toHaveBeenCalledTimes(1);
    expect(updateManifestMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      manifestId: 1,
      data: { humanVerified: false },
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation failed',
      }),
    );

    const toastArg = toastMock.mock.calls
      .map((call) => call[0] as any)
      .find((call) => call?.title === 'Validation failed');
    expect(toastArg?.action).toBeTruthy();
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

  it('shows scoped position X of N when audit navigation context is provided', () => {
    renderWithProviders(
      <AuditPanel
        projectId={1}
        groupId={1}
        manifestId={27}
        onClose={vi.fn()}
        allManifestIds={[27]}
        auditNav={{
          version: 1,
          projectId: 1,
          groupId: 1,
          scope: 'filtered',
          filters: {},
          sort: { field: 'filename', order: 'asc' },
          page: 2,
          pageSize: 25,
          total: 50,
          totalPages: 2,
          pageIds: [26, 27, 28],
          savedAt: Date.now(),
        }}
      />,
    );

    expect(screen.getByText('Filtered')).toBeInTheDocument();
    expect(screen.getByText('27 of 50')).toBeInTheDocument();
  });

  it('supports OCR refresh shortcut (O)', async () => {
    queueOcrRefreshJobMutateAsync.mockResolvedValue({ jobId: 'job-123' });

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'O' });

    expect(queueOcrRefreshJobMutateAsync).toHaveBeenCalledWith({ manifestId: 1 });
  });


  it('shows a toast when re-extract fails due to oversized OCR context', async () => {
    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    expect(webSocketOptionsRef.current?.onJobUpdate).toBeTypeOf('function');

    const message = 'OCR context too large for extraction; choose a larger-context model or reduce pages.';

    await act(async () => {
      webSocketOptionsRef.current.onJobUpdate({
        jobId: 'job-oversize',
        manifestId: 1,
        kind: 'extraction',
        progress: 0,
        status: 'failed',
        error: message,
      });
    });

    await act(async () => {
      webSocketOptionsRef.current.onJobUpdate({
        jobId: 'job-oversize',
        manifestId: 1,
        kind: 'extraction',
        progress: 0,
        status: 'failed',
        error: message,
      });
    });

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        description: message,
      }),
    );
  });
  it('renders live text extraction markdown from job-update events', async () => {
    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OCR Tab' }));

    expect(webSocketOptionsRef.current?.onJobUpdate).toBeTypeOf('function');

    await act(async () => {
      webSocketOptionsRef.current.onJobUpdate({
        jobId: 'job-123',
        manifestId: 1,
        kind: 'extraction',
        progress: 33,
        status: 'processing',
        textMarkdownSoFar: '--- PAGE 1 ---\nHello world',
        textPagesProcessed: 1,
        textPagesTotal: 2,
      });
    });

    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });

  it('does not trigger PATCH loop on auto-save (regression test)', async () => {
    // This test verifies the fix for the PATCH loop bug where:
    // 1. User edits form -> auto-save schedules a debounced PATCH
    // 2. Timer state update caused re-render -> new handleAutoSave identity
    // 3. EditableForm's effect depends on onSave -> re-runs and calls onSave again -> LOOP
    //
    // The fix uses useRef instead of useState for the timer, preventing re-renders.

    // Create a mock EditableForm that simulates the real behavior:
    // It calls onSave from an effect that depends on onSave identity
    function MockEditableForm({ onSave }: { onSave: (data: any) => void }) {
      const [isDirty, setIsDirty] = useState(false);

      // This effect simulates the real EditableForm behavior:
      // It depends on onSave and calls it when dirty
      useEffect(() => {
        if (!isDirty) return;
        // Call onSave - this triggers the debounced auto-save
        onSave({ extractedData: { invoice: { po_no: '0000002' } } });
      }, [isDirty, onSave]);

      return (
        <button
          type="button"
          onClick={() => setIsDirty(true)}
        >
          Edit Field
        </button>
      );
    }

    // Override the EditableForm mock for this test
    vi.mocked(await import('./EditableForm')).EditableForm = MockEditableForm as any;

    renderWithProviders(
      <AuditPanel projectId={1} groupId={1} manifestId={1} onClose={vi.fn()} allManifestIds={[1]} />,
    );

    // Reset the mock to clear any calls from initial render effects
    updateManifestMutateAsync.mockClear();

    // Simulate a form edit that triggers auto-save
    fireEvent.click(screen.getByRole('button', { name: 'Edit Field' }));

    // Advance timers past the 3000ms debounce delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Only ONE PATCH request should have been made (no loop)
    // With the bug, this would be 2+ due to the callback identity changing
    expect(updateManifestMutateAsync).toHaveBeenCalledTimes(1);
    expect(updateManifestMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        manifestId: 1,
        data: expect.objectContaining({
          extractedData: { invoice: { po_no: '0000002' } },
        }),
      }),
    );
  });
});
