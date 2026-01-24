import { act, renderWithProviders, screen, userEvent, waitFor } from '@/tests/utils';
import { useAuthStore } from '@/shared/stores/auth';
import { ProfilePage } from './ProfilePage';
import { server } from '@/tests/mocks/server';

describe('ProfilePage', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    act(() => {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        hasHydrated: true,
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  it('shows username and role', () => {
    act(() => {
      useAuthStore.setState({
        user: { id: 1, username: 'alice', role: 'user' },
        token: 'mock-token',
        isAuthenticated: true,
        hasHydrated: true,
      });
    });

    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('changes password successfully', async () => {
    const user = userEvent.setup();

    act(() => {
      useAuthStore.setState({
        user: { id: 1, username: 'alice', role: 'user' },
        token: 'mock-token',
        isAuthenticated: true,
        hasHydrated: true,
      });
    });

    renderWithProviders(<ProfilePage />);

    await user.type(screen.getByLabelText('Current password'), 'CurrentPass1!');
    await user.type(screen.getByLabelText('New password'), 'StrongPass1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Your password has been updated.',
      );
    });
  });

  it('shows inline error for wrong current password', async () => {
    const user = userEvent.setup();

    act(() => {
      useAuthStore.setState({
        user: { id: 1, username: 'alice', role: 'user' },
        token: 'mock-token',
        isAuthenticated: true,
        hasHydrated: true,
      });
    });

    renderWithProviders(<ProfilePage />);

    await user.type(screen.getByLabelText('Current password'), 'wrong');
    await user.type(screen.getByLabelText('New password'), 'StrongPass1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument();
    });
  });
});
