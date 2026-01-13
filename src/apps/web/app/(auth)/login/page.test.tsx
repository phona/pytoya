import { renderWithProviders, screen } from '@/test/utils';
import LoginPage from './page';

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/PyToYa/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('should have email and password inputs with correct attributes', () => {
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should have submit button', () => {
    renderWithProviders(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
