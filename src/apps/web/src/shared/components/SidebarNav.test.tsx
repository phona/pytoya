import { Routes, Route } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SidebarNav } from './SidebarNav';
import { useAuthStore } from '@/shared/stores/auth';

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/hooks/use-auth', () => ({
  useAuth: () => ({ logout: logoutMock }),
}));

describe('SidebarNav', () => {
  beforeEach(() => {
    logoutMock.mockClear();
    act(() => {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        hasHydrated: true,
      });
    });
  });

  it('highlights the active route', () => {
    act(() => {
      useAuthStore.setState({
        user: { id: 1, username: 'admin', role: 'admin' },
        token: 'token',
        isAuthenticated: true,
        hasHydrated: true,
      });
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/models/*"
          element={
            <SidebarNav
              isDesktop={false}
              isDesktopCollapsed={false}
              isOpen={true}
              onClose={vi.fn()}
              onDesktopCollapse={vi.fn()}
              onDesktopExpand={vi.fn()}
            />
          }
        />
      </Routes>,
      { route: '/models/abc' },
    );

    const modelsLink = screen.getByRole('link', { name: 'Models' });
    expect(modelsLink).toHaveAttribute('aria-current', 'page');
  });

  it('closes the sidebar on navigation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    act(() => {
      useAuthStore.setState({
        user: { id: 1, username: 'admin', role: 'admin' },
        token: 'token',
        isAuthenticated: true,
        hasHydrated: true,
      });
    });

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route
            path="/projects"
            element={
              <SidebarNav
                isDesktop={false}
                isDesktopCollapsed={false}
                isOpen={true}
                onClose={onClose}
                onDesktopCollapse={vi.fn()}
                onDesktopExpand={vi.fn()}
              />
            }
          />
          <Route path="/models" element={<div>Models</div>} />
        </Routes>,
        { route: '/projects' },
      );
    });

    await act(async () => {
      await user.click(screen.getByRole('link', { name: 'Models' }));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('hides admin-only links for non-admin users', async () => {
    await act(async () => {
      renderWithProviders(
        <SidebarNav
          isDesktop={false}
          isDesktopCollapsed={false}
          isOpen={true}
          onClose={vi.fn()}
          onDesktopCollapse={vi.fn()}
          onDesktopExpand={vi.fn()}
        />,
      );
    });

    expect(screen.queryByRole('link', { name: 'Extractors' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Models' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('invokes logout when sign out is clicked', async () => {
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <SidebarNav
          isDesktop={false}
          isDesktopCollapsed={false}
          isOpen={true}
          onClose={vi.fn()}
          onDesktopCollapse={vi.fn()}
          onDesktopExpand={vi.fn()}
        />,
      );
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Sign out/i }));
    });

    expect(logoutMock).toHaveBeenCalled();
  });

  it('invokes desktop collapse when collapse is clicked', async () => {
    const user = userEvent.setup();
    const onDesktopCollapse = vi.fn();

    await act(async () => {
      renderWithProviders(
        <SidebarNav
          isDesktop={true}
          isDesktopCollapsed={false}
          isOpen={false}
          onClose={vi.fn()}
          onDesktopCollapse={onDesktopCollapse}
          onDesktopExpand={vi.fn()}
        />,
      );
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Close sidebar' }));
    });

    expect(onDesktopCollapse).toHaveBeenCalledTimes(1);
  });

  it('removes sidebar links from a11y tree when mobile sidebar is closed', async () => {
    await act(async () => {
      renderWithProviders(
        <SidebarNav
          isDesktop={false}
          isDesktopCollapsed={false}
          isOpen={false}
          onClose={vi.fn()}
          onDesktopCollapse={vi.fn()}
          onDesktopExpand={vi.fn()}
        />,
      );
    });

    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('removes sidebar links from a11y tree when desktop sidebar is collapsed', async () => {
    await act(async () => {
      renderWithProviders(
        <SidebarNav
          isDesktop={true}
          isDesktopCollapsed={true}
          isOpen={false}
          onClose={vi.fn()}
          onDesktopCollapse={vi.fn()}
          onDesktopExpand={vi.fn()}
        />,
      );
    });

    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeInTheDocument();
  });
});




