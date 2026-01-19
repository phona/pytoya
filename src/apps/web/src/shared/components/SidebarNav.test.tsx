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
          element={<SidebarNav isOpen={false} onClose={vi.fn()} />}
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
            element={<SidebarNav isOpen={true} onClose={onClose} />}
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
      renderWithProviders(<SidebarNav isOpen={false} onClose={vi.fn()} />);
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Sign out/i }));
    });

    expect(logoutMock).toHaveBeenCalled();
  });
});




