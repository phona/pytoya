import { Routes, Route, useLocation } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '@/shared/stores/auth';

function LoginLocation() {
  const location = useLocation();
  return <div>Login{location.search}</div>;
}

describe('ProtectedRoute', () => {
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

  it('renders child routes when authenticated', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: true, hasHydrated: true });
    });

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<div>Projects</div>} />
        </Route>
        <Route path="/login" element={<LoginLocation />} />
      </Routes>,
      { route: '/projects' },
    );

    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login with next_url', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false, hasHydrated: true });
    });

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<div>Projects</div>} />
        </Route>
        <Route path="/login" element={<LoginLocation />} />
      </Routes>,
      { route: '/projects?page=2' },
    );

    expect(screen.getByText('Login?next_url=%2Fprojects%3Fpage%3D2')).toBeInTheDocument();
  });

  it('shows a loading state before auth hydration completes', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false, hasHydrated: false });
    });

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<div>Projects</div>} />
        </Route>
        <Route path="/login" element={<LoginLocation />} />
      </Routes>,
      { route: '/projects' },
    );

    expect(screen.getByText('Checking your session...')).toBeInTheDocument();
  });
});
