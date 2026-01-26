import { act, renderWithProviders, screen } from '@/tests/utils';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        hasHydrated: true,
      });
    });
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    expect(screen.getByText(/PyToYa/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('should have username and password inputs with correct attributes', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should have submit button', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('navigates to next_url when already authenticated', async () => {
    const LocationProbe = ({ label }: { label: string }) => {
      const location = useLocation();
      return <div>{label}{location.pathname}{location.search}</div>;
    };

    act(() => {
      useAuthStore.setState({ isAuthenticated: true, hasHydrated: true });
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/projects" element={<LocationProbe label="Dest:" />} />
      </Routes>,
      { route: '/login?next_url=%2Fprojects%3Fpage%3D2' },
    );

    expect(await screen.findByText('Dest:/projects?page=2')).toBeInTheDocument();
  });
});




