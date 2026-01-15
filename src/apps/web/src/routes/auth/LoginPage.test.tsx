import { renderWithProviders, screen } from '@/test/utils';
import LoginPage from './page';

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/PyToYa/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('should have username and password inputs with correct attributes', () => {
    renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should have submit button', () => {
    renderWithProviders(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
