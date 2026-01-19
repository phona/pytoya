import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Manifest } from '@/api/manifests';
import { ManifestCard } from './ManifestCard';

describe('ManifestCard', () => {
  it('triggers onClick when pressing Enter', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const manifest: Manifest = {
      id: 1,
      filename: 'invoice-001.pdf',
      originalFilename: 'invoice-001.pdf',
      storagePath: '/tmp/invoice-001.pdf',
      fileSize: 2048,
      fileType: 'pdf' as Manifest['fileType'],
      status: 'completed' as Manifest['status'],
      groupId: 1,
      extractedData: null,
      confidence: 0.92,
      purchaseOrder: 'PO-123',
      invoiceDate: '2025-01-15T00:00:00.000Z',
      department: 'Finance',
      humanVerified: true,
      validationResults: null,
      createdAt: '2025-01-15T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    };

    render(<ManifestCard manifest={manifest} onClick={onClick} />);

    const card = screen.getByRole('button', { name: /invoice-001/i });
    card.focus();
    expect(card).toHaveFocus();

    await act(async () => {
      await user.keyboard('{Enter}');
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});




