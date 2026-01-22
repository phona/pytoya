import { Routes, Route } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SidebarNav } from './SidebarNav';

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/hooks/use-auth', () => ({
  useAuth: () => ({ logout: logoutMock }),
}));

describe('SidebarNav', () => {
  beforeEach(() => {
    logoutMock.mockClear();
  });

  it('highlights the active route', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/models/*"
          element={
            <SidebarNav
              isDesktop={false}
              isDesktopCollapsed={false}
              isOpen={false}
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

  it('invokes logout when sign out is clicked', async () => {
    const user = userEvent.setup();

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
});




