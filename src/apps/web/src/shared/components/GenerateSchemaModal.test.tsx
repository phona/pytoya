import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { GenerateSchemaModal } from './GenerateSchemaModal';

describe('GenerateSchemaModal', () => {
  it('submits description to generator', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <GenerateSchemaModal open={true} onClose={onClose} onGenerate={onGenerate} />,
    );

    const textarea = screen.getByPlaceholderText(/Invoice with PO number/i);
    await user.type(textarea, 'Invoice schema');
    await user.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('Invoice schema', true);
    });
    expect(onClose).toHaveBeenCalled();
  });
});




