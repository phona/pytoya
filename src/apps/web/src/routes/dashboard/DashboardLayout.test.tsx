import { Routes, Route } from 'react-router-dom';
import { act, renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { DashboardLayout } from './DashboardLayout';

describe('DashboardLayout navigation', () => {
  it('navigates to sidebar destinations', async () => {
    const user = userEvent.setup();

    await act(async () => {
      renderWithProviders(
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/projects" element={<div>Projects Page</div>} />
            <Route path="/models" element={<div>Models Page</div>} />
          </Route>
        </Routes>,
        { route: '/projects' },
      );
    });

    expect(screen.getByText('Projects Page')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('link', { name: 'Models' }));
    });

    expect(await screen.findByText('Models Page')).toBeInTheDocument();
  });
});
