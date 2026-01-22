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
    expect(screen.getByText('Manifest #42 extraction')).toBeInTheDocument();
  });
});

