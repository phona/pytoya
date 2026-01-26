import { act, renderWithProviders, screen } from '@/tests/utils';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectSettingsValidationScriptsPage } from './ProjectSettingsValidationScriptsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

describe('ProjectSettingsValidationScriptsPage', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    navigateMock.mockClear();
  });

  afterAll(() => {
    server.close();
  });

  it('opens create dialog from empty state', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(<ProjectSettingsValidationScriptsPage />, { route: '/projects/1/settings/validation-scripts' });
    });

    await screen.findByRole('heading', { name: /validation scripts/i, level: 1 });

    const newButtons = screen.getAllByRole('button', { name: /new script/i });
    await user.click(newButtons[0]!);

    await screen.findByRole('heading', { name: /create validation script/i });
  });

  it('confirms discard when closing dirty create dialog', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await act(async () => {
      renderWithProviders(<ProjectSettingsValidationScriptsPage />, { route: '/projects/1/settings/validation-scripts' });
    });

    await screen.findByRole('heading', { name: /validation scripts/i, level: 1 });

    await user.click(screen.getAllByRole('button', { name: /new script/i })[0]!);
    await screen.findByRole('heading', { name: /create validation script/i });

    await user.type(screen.getByLabelText(/script name/i), 'X');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    const discardTitle = await screen.findByText(/discard changes\\?/i);
    const discardDialog = discardTitle.closest('[role="dialog"]');
    expect(discardDialog).not.toBeNull();

    await user.click(within(discardDialog as HTMLElement).getByRole('button', { name: /discard/i }));

    expect(screen.queryByRole('heading', { name: /create validation script/i })).not.toBeInTheDocument();
  });
});
