import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, userEvent } from '@/tests/utils';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div>Healthy</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('shows fallback UI and recovers on retry', async () => {
    const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Boom');
      }
      return <div>Recovered</div>;
    };
    const user = userEvent.setup();

    const view = renderWithProviders(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    view.rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );

    const retryButton = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryButton);

    expect(await screen.findByText('Recovered')).toBeInTheDocument();
  });

  it('catches route errors when used inside routing', () => {
    const BombRoute = () => {
      throw new Error('Route crash');
    };

    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary title="Route error">
              <BombRoute />
            </ErrorBoundary>
          }
        />
      </Routes>,
      { route: '/' },
    );

    expect(screen.getByText('Route error')).toBeInTheDocument();
  });
});
