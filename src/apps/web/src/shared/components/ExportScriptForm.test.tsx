import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderWithProviders, screen, userEvent, waitFor } from '@/tests/utils';
import { ExportScriptForm } from './ExportScriptForm';

const validateMutateAsync = vi.fn();
const testMutateAsync = vi.fn();
const alertMock = vi.fn();

vi.mock('@/shared/hooks/use-projects', () => ({
  useProjects: () => ({
    projects: [{ id: 1, name: 'Test Project', llmModelId: 'llm-1', defaultSchemaId: 10 }],
  }),
}));

vi.mock('@/shared/hooks/use-export-scripts', () => ({
  useValidateExportScriptSyntax: () => ({ mutateAsync: validateMutateAsync }),
  useTestExportScript: () => ({ mutateAsync: testMutateAsync, isPending: false }),
}));

vi.mock('@/shared/hooks/use-modal-dialog', () => ({
  useModalDialog: () => ({
    alert: alertMock,
    ModalDialog: () => null,
  }),
}));

describe('ExportScriptForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs syntax check and shows success alert', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    validateMutateAsync.mockResolvedValueOnce({ valid: true });

    await act(async () => {
      renderWithProviders(
        <ExportScriptForm
          fixedProjectId={1}
          showProjectField={false}
          onSubmit={vi.fn(async () => undefined)}
          onCancel={vi.fn()}
        />,
      );
    });

    await user.click(screen.getByRole('button', { name: /check syntax/i }));

    await waitFor(() => {
      expect(validateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ script: expect.stringContaining('function exportRows') }),
      );
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Syntax check', message: 'Syntax is valid!' }),
      );
    });
  });

  it('runs test and shows preview and logs', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    testMutateAsync.mockResolvedValueOnce({
      rows: [{ ok: true }],
      debug: { logs: [{ level: 'log', message: 'hello' }] },
    });

    await act(async () => {
      renderWithProviders(
        <ExportScriptForm
          fixedProjectId={1}
          showProjectField={false}
          onSubmit={vi.fn(async () => undefined)}
          onCancel={vi.fn()}
        />,
      );
    });

    await user.click(screen.getByRole('button', { name: /run test/i }));

    expect(testMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        debug: true,
        format: 'csv',
        script: expect.any(String),
        extractedData: expect.objectContaining({ invoice: expect.any(Object), items: expect.any(Array) }),
      }),
    );

    await screen.findByText(/showing 1 of 1 rows/i);
    expect(screen.getByText(/"ok": true/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /logs/i }));
    expect(await screen.findByText(/\[log\] hello/i)).toBeInTheDocument();
  });

  it('submits trimmed fields and parsed priority', async () => {
    const onSubmit = vi.fn(async () => undefined);

    await act(async () => {
      renderWithProviders(
        <ExportScriptForm
          fixedProjectId={1}
          showProjectField={false}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '  Normalize  ' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: '7' } });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Normalize',
        projectId: '1',
        enabled: true,
        priority: 7,
        description: undefined,
      }),
    );
  });
});
