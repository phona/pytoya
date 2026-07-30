import { renderWithProviders, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectSettingsExtractorsPage } from './ProjectSettingsExtractorsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

const mockPipeline = (entries: Array<{ extractorId: string; config: Record<string, unknown> }>) => ({
  pipeline: entries,
  savedPipeline: entries,
  isDirty: false,
  extractorInstances: [
    { id: 'ext-1', name: 'PaddleOCR Production', extractorType: 'paddle-ocr-vl', config: { baseUrl: 'https://ocr-prod:8080' }, isActive: true, description: 'Production instance', createdAt: '2025-01-13T00:00:00.000Z', updatedAt: '2025-01-13T00:00:00.000Z' },
    { id: 'ext-2', name: 'Inference OCR Dev', extractorType: 'inference-ocr', config: { baseUrl: 'http://localhost:8090' }, isActive: true, description: 'Dev instance', createdAt: '2025-01-13T00:00:00.000Z', updatedAt: '2025-01-13T00:00:00.000Z' },
  ],
  instanceMap: new Map([
    ['ext-1', { id: 'ext-1', name: 'PaddleOCR Production', extractorType: 'paddle-ocr-vl', config: {}, isActive: true, description: '', createdAt: '2025-01-13T00:00:00.000Z', updatedAt: '2025-01-13T00:00:00.000Z' }],
  ]),
  extractorTypeMap: new Map([
    ['paddle-ocr-vl', { type: 'paddle-ocr-vl', configSchema: { type: 'object', properties: {} }, promptContribution: 'test' }],
  ]),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  move: vi.fn(),
  save: vi.fn(),
  isSaving: false,
  saveError: null,
  isLoading: false,
});

vi.mock('@/shared/hooks/use-ocr-pipeline', () => ({
  useOcrPipeline: vi.fn(),
}));

vi.mock('@/shared/hooks/use-projects', () => ({
  useProject: () => ({ project: { id: 1, name: 'Test Project', userId: 1 }, isLoading: false, error: null }),
}));

vi.mock('@/shared/hooks/use-schemas', () => ({
  useProjectSchemas: () => ({ schemas: [{ id: 10 }], isLoading: false, error: null }),
}));

import { useOcrPipeline } from '@/shared/hooks/use-ocr-pipeline';

describe('ProjectSettingsExtractorsPage', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
    navigateMock.mockClear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it('shows loading state', async () => {
    vi.mocked(useOcrPipeline).mockReturnValue({
      pipeline: [],
      savedPipeline: [],
      isDirty: false,
      extractorInstances: [],
      instanceMap: new Map(),
      extractorTypeMap: new Map(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      move: vi.fn(),
      save: vi.fn(),
      isSaving: false,
      saveError: null,
      isLoading: true,
    });

    renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });
    expect(screen.getByText('OCR Pipeline')).toBeTruthy();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state when no OCR engines configured', async () => {
    vi.mocked(useOcrPipeline).mockReturnValue(mockPipeline([]));

    renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });

    expect(screen.getByText('No OCR engines configured.')).toBeTruthy();
  });

  it('renders pipeline list when extractors configured', async () => {
    vi.mocked(useOcrPipeline).mockReturnValue(mockPipeline([
      { extractorId: 'ext-1', config: {} },
    ]));

    renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });

    expect(screen.getByText('PaddleOCR Production')).toBeTruthy();
  });

  it('save button disabled when clean (no changes)', async () => {
    vi.mocked(useOcrPipeline).mockReturnValue({
      ...mockPipeline([]),
      isDirty: false,
    });

    renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    expect(saveBtn).toBeDisabled();
  });

  it('add interaction calls add callback', async () => {
    const mockAdd = vi.fn();
    vi.mocked(useOcrPipeline).mockReturnValue({
      ...mockPipeline([]),
      add: mockAdd,
    });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });

    await user.click(screen.getByRole('button', { name: /Add OCR Engine/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    const radio = document.querySelector('input[name="extractor-instance"][value="ext-1"]') as HTMLInputElement;
    await user.click(radio);

    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /Add/i }));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalled();
    });
  });

  it('remove interaction calls remove callback with confirmation', async () => {
    const mockRemove = vi.fn();
    vi.mocked(useOcrPipeline).mockReturnValue({
      ...mockPipeline([{ extractorId: 'ext-1', config: {} }]),
      remove: mockRemove,
    });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });

    expect(screen.getByText('PaddleOCR Production')).toBeTruthy();

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const trashBtn = document.querySelector('.lucide-trash2')?.closest('button') as HTMLButtonElement;
    await user.click(trashBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith(0);
  });
});
