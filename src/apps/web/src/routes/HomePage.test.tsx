import { Route, Routes } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import { useAuthStore } from '@/shared/stores/auth';
import { HomePage } from './HomePage';

describe('HomePage', () => {
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

  it('redirects unauthenticated users to login', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false, hasHydrated: true });
    });

    renderWithProviders(
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects authenticated users to projects', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: true, hasHydrated: true });
    });

    renderWithProviders(
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<div>Projects Home</div>} />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Projects Home')).toBeInTheDocument();
  });

  it('shows loading state before auth hydration completes', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false, hasHydrated: false });
    });

    renderWithProviders(<HomePage />);

    expect(screen.getByText('Checking your session...')).toBeInTheDocument();
  });
});




