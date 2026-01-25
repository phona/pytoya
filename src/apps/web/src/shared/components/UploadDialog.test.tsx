import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/tests/utils';
import { UploadDialog } from './UploadDialog';

const mockUploadBatch = vi.fn();

vi.mock('@/api/manifests', async () => {
  const actual = await vi.importActual<typeof import('@/api/manifests')>('@/api/manifests');
  return {
    ...actual,
    manifestsApi: {
      ...actual.manifestsApi,
      uploadManifestsBatch: (...args: unknown[]) => mockUploadBatch(...args),
    },
  };
});

describe('UploadDialog', () => {
  it('shows mixed batch summary counts (created/duplicates/failed)', async () => {
    mockUploadBatch.mockResolvedValue([
      { status: 'fulfilled', value: { id: 1, isDuplicate: false } },
      { status: 'fulfilled', value: { id: 2, isDuplicate: true } },
      { status: 'rejected', reason: { message: 'boom' } },
    ]);

    renderWithProviders(
      <UploadDialog projectId={1} groupId={2} isOpen={true} onClose={() => {}} />,
      { route: '/projects/1/groups/2/manifests' },
    );

    const input = screen.getByLabelText('Select PDF files');
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
      new File(['c'], 'c.pdf', { type: 'application/pdf' }),
    ];

    fireEvent.change(input, { target: { files } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload 3 Files' }));

    await waitFor(() => {
      expect(mockUploadBatch).toHaveBeenCalled();
    });

    const summary = await screen.findByTestId('upload-summary');
    expect(summary.textContent).toContain('Created 1');
    expect(summary.textContent).toContain('duplicates 1');
    expect(summary.textContent).toContain('failed 1');

    expect(screen.getByTestId('upload-item-0').getAttribute('data-upload-status')).toBe('success');
    expect(screen.getByTestId('upload-item-1').getAttribute('data-upload-status')).toBe('duplicate');
    expect(screen.getByTestId('upload-item-2').getAttribute('data-upload-status')).toBe('error');
  });
});

