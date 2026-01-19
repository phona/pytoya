import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No data" description="Add your first item." />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Add your first item.')).toBeInTheDocument();
  });

  it('renders icon and action button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        title="No results"
        icon={FileText}
        action={{ label: 'Create', onClick }}
      />,
    );

    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});




