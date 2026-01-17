import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders title and content when open', () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()} title="Test Dialog">
        <div>Dialog Body</div>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog Body')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose} title="Test Dialog">
        <div>Dialog Body</div>
      </Dialog>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on overlay click', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose} title="Test Dialog">
        <div>Dialog Body</div>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog');
    const overlayButton = dialog.parentElement?.querySelector(
      'button[aria-hidden="true"]',
    ) as HTMLButtonElement | null;
    expect(overlayButton).toBeTruthy();
    fireEvent.click(overlayButton as HTMLButtonElement);
    expect(onClose).toHaveBeenCalled();
  });
});
