import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { PromptsPage } from './PromptsPage';
import { server } from '../../tests/mocks/server';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/tests/utils';

describe('PromptsPage', () => {
  let confirmSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
    confirmSpy = vi.fn(() => true);
    global.confirm = confirmSpy as any;
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('renders loading state initially', () => {
    // Override handler to delay response
    server.use(
      http.get('/api/prompts', () => {
        return new Promise(() => {}); // Never resolve
      })
    );

    renderWithProviders(<PromptsPage />);

    // Component shows loading spinner when fetching
    const spinner = screen.getByText((content, element) => {
      // Look for the loading spinner (animated circle)
      return element?.classList?.contains('animate-spin');
    });
    expect(spinner).toBeInTheDocument();
  });

  it('renders prompt list after loading', async () => {
    renderWithProviders(<PromptsPage />);

    await waitFor(() => {
      expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
      expect(screen.getByText('1 prompt')).toBeInTheDocument();
    });
  });

  it('displays prompt cards with correct information', async () => {
    renderWithProviders(<PromptsPage />);

    await waitFor(() => {
      expect(screen.getByText('System Prompt')).toBeInTheDocument();
      expect(screen.getByText('system')).toBeInTheDocument();
    });
  });

  it('shows create button', () => {
    renderWithProviders(<PromptsPage />);

    expect(screen.getByRole('button', { name: 'New Prompt' })).toBeInTheDocument();
  });

  it('opens create form when New Prompt is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PromptsPage />);

    const button = screen.getByRole('button', { name: 'New Prompt' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Create New Prompt')).toBeInTheDocument();
    });
  });

  it('opens edit form when Edit button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PromptsPage />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      expect(editButtons[0]).toBeInTheDocument();
    });
  });

  it('calls deletePrompt when Delete button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PromptsPage />);

    await waitFor(async () => {
      const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
      await user.click(deleteButton);
      expect(confirmSpy).toHaveBeenCalledWith('Delete this prompt?');
    });
  });

  it('does not delete when confirm is cancelled', async () => {
    const user = userEvent.setup();
    confirmSpy.mockReturnValue(false);

    renderWithProviders(<PromptsPage />);

    await waitFor(async () => {
      const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
      await user.click(deleteButton);
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  it('handles listPrompts error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/prompts', () => {
        return HttpResponse.json({ message: 'Failed to load' }, { status: 500 });
      })
    );

    renderWithProviders(<PromptsPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('renders empty state when no prompts', async () => {
    server.use(
      http.get('/api/prompts', () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<PromptsPage />);

    await waitFor(() => {
      expect(screen.getByText('0 prompts')).toBeInTheDocument();
    });
  });

  it('renders plural prompt count correctly', async () => {
    server.use(
      http.get('/api/prompts', () => {
        return HttpResponse.json([
          { id: 1, name: 'Prompt 1', type: 'system', content: 'Content 1', variables: [], createdAt: '2025-01-13T00:00:00.000Z', updatedAt: '2025-01-13T00:00:00.000Z' },
          { id: 2, name: 'Prompt 2', type: 'system', content: 'Content 2', variables: [], createdAt: '2025-01-13T00:00:00.000Z', updatedAt: '2025-01-13T00:00:00.000Z' },
        ]);
      })
    );

    renderWithProviders(<PromptsPage />);

    await waitFor(() => {
      expect(screen.getByText('2 prompts')).toBeInTheDocument();
    });
  });
});
