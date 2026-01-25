import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobsPanel } from './JobsPanel';
import { renderWithProviders, screen, userEvent } from '@/tests/utils';
import { useJobsStore } from '@/shared/stores/jobs';
import { useUiStore } from '@/shared/stores/ui';

vi.mock('@/shared/hooks/use-jobs', () => ({
  useJobHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/shared/hooks/use-websocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    isConnecting: false,
    subscribeToManifest: vi.fn(),
    unsubscribeFromManifest: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-manifests', () => ({
  useManifest: (manifestId: number) => ({ data: { originalFilename: `file-${manifestId}.pdf` } }),
}));

describe('JobsPanel', () => {
  beforeEach(() => {
    localStorage.removeItem('pytoya-desktop-sidebar-collapsed');
    localStorage.removeItem('pytoya-jobs');
    useJobsStore.setState({ ownerUserId: 1, hasHydrated: true, jobs: [] });
    useUiStore.setState({
      isSidebarOpen: false,
      isDesktopSidebarCollapsed: false,
      isJobsPanelOpen: false,
    });
  });

  it('shows a badge count for in-progress jobs', () => {
    const now = new Date().toISOString();
    useJobsStore.setState({
      ownerUserId: 1,
      hasHydrated: true,
      jobs: [
        {
          id: '123',
          kind: 'extraction',
          manifestId: 10,
          status: 'active',
          progress: 5,
          error: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    renderWithProviders(<JobsPanel />);
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens the panel and lists jobs', async () => {
    const now = new Date().toISOString();
    useJobsStore.setState({
      ownerUserId: 1,
      hasHydrated: true,
      jobs: [
        {
          id: '123',
          kind: 'extraction',
          manifestId: 42,
          status: 'active',
          progress: 50,
          error: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders(<JobsPanel />);

    await user.click(screen.getByRole('button', { name: /open jobs panel/i }));
    expect(screen.getAllByText('Jobs').length).toBeGreaterThan(0);
    expect(screen.getByText('file-42.pdf extraction')).toBeInTheDocument();
  });

  it('filters terminal jobs into completed vs failed/canceled', async () => {
    const now = new Date().toISOString();
    useJobsStore.setState({
      ownerUserId: 1,
      hasHydrated: true,
      jobs: [
        { id: 'active', kind: 'extraction', manifestId: 1, status: 'active', progress: 10, error: null, createdAt: now, updatedAt: now },
        { id: 'done', kind: 'extraction', manifestId: 2, status: 'completed', progress: 100, error: null, createdAt: now, updatedAt: now },
        { id: 'failed', kind: 'extraction', manifestId: 3, status: 'failed', progress: 100, error: 'boom', createdAt: now, updatedAt: now },
        { id: 'canceled', kind: 'extraction', manifestId: 4, status: 'canceled', progress: 20, error: 'canceled', createdAt: now, updatedAt: now },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders(<JobsPanel />);

    await user.click(screen.getByRole('button', { name: /open jobs panel/i }));

    // Default tab: in progress
    expect(screen.getByText('file-1.pdf extraction')).toBeInTheDocument();
    expect(screen.queryByText('file-2.pdf extraction')).not.toBeInTheDocument();
    expect(screen.queryByText('file-3.pdf extraction')).not.toBeInTheDocument();
    expect(screen.queryByText('file-4.pdf extraction')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /completed|done/i }));
    expect(screen.getByText('file-2.pdf extraction')).toBeInTheDocument();
    expect(screen.queryByText('file-3.pdf extraction')).not.toBeInTheDocument();
    expect(screen.queryByText('file-4.pdf extraction')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /failed/i }));
    expect(screen.getByText('file-3.pdf extraction')).toBeInTheDocument();
    expect(screen.getByText('file-4.pdf extraction')).toBeInTheDocument();
    expect(screen.queryByText('file-2.pdf extraction')).not.toBeInTheDocument();
  });
});

