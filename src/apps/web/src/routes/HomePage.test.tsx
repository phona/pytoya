import { Route, Routes } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import { useAuthStore } from '@/api/auth-store';
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

  it('renders landing page when not authenticated', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false, hasHydrated: true });
    });

    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /PyToYa turns documents/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Create account/i })
    ).toBeInTheDocument();
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
