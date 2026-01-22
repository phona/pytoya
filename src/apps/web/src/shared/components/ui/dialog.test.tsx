import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

function TestDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button">Open dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogHeader>
        <div>Dialog body</div>
        <div className="flex gap-2">
          <button type="button">Primary action</button>
          <button type="button">Secondary action</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('opens and closes with Escape while restoring focus', async () => {
    const user = userEvent.setup();

    render(<TestDialog />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await act(async () => {
      await user.click(trigger);
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const labelledBy = dialog.getAttribute('aria-labelledby');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(labelledBy ?? '')).toHaveTextContent('Dialog title');
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('Dialog description');

    expect(dialog.contains(document.activeElement)).toBe(true);

    await act(async () => {
      await user.tab();
    });

    expect(dialog.contains(document.activeElement)).toBe(true);

    await act(async () => {
      await user.keyboard('{Escape}');
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(trigger).toHaveFocus();
  });

  it('does not bubble Escape to window listeners', async () => {
    const user = userEvent.setup();
    const windowEscapeHandler = vi.fn();

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        windowEscapeHandler();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    try {
      render(<TestDialog />);

      const trigger = screen.getByRole('button', { name: 'Open dialog' });
      await act(async () => {
        await user.click(trigger);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(windowEscapeHandler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', handleWindowKeyDown);
    }
  });
});




