import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SettingsCard } from './SettingsCard';

describe('SettingsCard', () => {
  it('renders title, description, and meta text', () => {
    render(
      <SettingsCard
        title="Schema"
        description="Review schema details"
        meta="Default schema: #12"
      />,
    );

    expect(screen.getByText('Schema')).toBeInTheDocument();
    expect(screen.getByText('Review schema details')).toBeInTheDocument();
    expect(screen.getByText('Default schema: #12')).toBeInTheDocument();
  });

  it('fires onClick for pointer and keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <SettingsCard
        title="Rules"
        description="Manage rules"
        onClick={onClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: /rules/i }));
    expect(onClick).toHaveBeenCalledTimes(1);

    const button = screen.getByRole('button', { name: /rules/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});




