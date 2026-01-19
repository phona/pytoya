import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Group } from '@/api/projects';
import { GroupCard } from './GroupCard';

const baseGroup: Group = {
  id: 1,
  name: 'Invoices',
  projectId: 7,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  _count: { manifests: 3 },
  statusCounts: { pending: 1, failed: 1, verified: 1 },
};

describe('GroupCard', () => {
  it('calls onClick when the card is activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<GroupCard group={baseGroup} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: /invoices/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger card navigation from edit or delete actions', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <GroupCard
        group={baseGroup}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^Edit$/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});




