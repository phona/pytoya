import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ImportSchemaModal } from './ImportSchemaModal';

describe('ImportSchemaModal', () => {
  it('uploads and submits a file', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ImportSchemaModal open={true} onClose={onClose} onImport={onImport} />,
    );

    const file = new File(['{}'], 'schema.json', { type: 'application/json' });
    const dialog = await screen.findByRole('dialog');
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    await user.upload(input as HTMLInputElement, file);

    await user.click(screen.getByRole('button', { name: /Import/i }));

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(file);
    });
    expect(onClose).toHaveBeenCalled();
  });
});
