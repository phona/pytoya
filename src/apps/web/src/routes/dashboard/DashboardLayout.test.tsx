import { Routes, Route } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/shared/stores/auth';
import { useUiStore } from '@/shared/stores/ui';
import { DashboardLayout } from './DashboardLayout';

describe('DashboardLayout navigation', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({
        user: { id: 1, username: 'admin', role: 'admin' },
        token: 'token',
        isAuthenticated: true,
        hasHydrated: true,
      });
    });
  });

  afterEach(() => {
    act(() => {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        hasHydrated: true,
      });
    });
  });

  it('allows toggling the sidebar on desktop', async () => {
    const user = userEvent.setup();
    const originalMatchMedia = (window as unknown as { matchMedia?: typeof window.matchMedia })
      .matchMedia;

    (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = (query) =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    useUiStore.setState({
      isSidebarOpen: false,
      isDesktopSidebarCollapsed: true,
      isJobsPanelOpen: false,
    });

    try {
      await act(async () => {
        renderWithProviders(
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/projects" element={<div>Projects Page</div>} />
              <Route path="/profile" element={<div>Profile Page</div>} />
            </Route>
          </Routes>,
          { route: '/projects' },
        );
      });

      expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeInTheDocument();

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
      });

      expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    } finally {
      (window as unknown as { matchMedia?: typeof window.matchMedia }).matchMedia = originalMatchMedia;
      localStorage.removeItem('pytoya-desktop-sidebar-collapsed');
    }
  });

  it('navigates to sidebar destinations', async () => {
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/projects" element={<div>Projects Page</div>} />
            <Route path="/profile" element={<div>Profile Page</div>} />
          </Route>
        </Routes>,
        { route: '/projects' },
      );
    });

    expect(screen.getByText('Projects Page')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('link', { name: 'Profile' }));
    });

    expect(await screen.findByText('Profile Page')).toBeInTheDocument();
  });
});




