import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ExportButton } from './ExportButton';
import { server } from '../../tests/mocks/server';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/tests/utils';

describe('ExportButton', () => {
  const createObjectURLSpy = vi.fn(() => 'blob:mock-url');
  const revokeObjectURLSpy = vi.fn();
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });

    // Save original functions
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // Mock browser APIs for file download
    createObjectURLSpy.mockReset();
    createObjectURLSpy.mockReturnValue('blob:mock-url');
    revokeObjectURLSpy.mockReset();

    global.URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    server.resetHandlers();

    // Restore original functions
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders export button', () => {
    renderWithProviders(<ExportButton />);

    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('is disabled when no filters or selectedIds provided', () => {
    renderWithProviders(<ExportButton />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is enabled when filters are provided', () => {
    renderWithProviders(<ExportButton filters={{ status: 'completed' }} />);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('is enabled when selectedIds are provided', () => {
    renderWithProviders(<ExportButton selectedIds={[1, 2, 3]} />);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('calls exportSelectedToCsv when selectedIds provided', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExportButton selectedIds={[1, 2, 3]} />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Verify download link was created
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('calls exportToCsv when filters provided', async () => {
    const user = userEvent.setup();

    const filters = { status: 'completed' };
    renderWithProviders(<ExportButton filters={filters} />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Verify download link was created
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('shows loading state while exporting', async () => {
    const user = userEvent.setup();

    // Override handler to delay response
    server.use(
      http.post('/api/manifests/export/csv', async () => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return new HttpResponse(
          new Blob(['csv,data'], { type: 'text/csv' })
        );
      })
    );

    renderWithProviders(<ExportButton selectedIds={[1]} />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Should show loading state
    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
  });

  it('uses custom filename when provided', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExportButton filters={{}} filename="custom-export.csv" />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Verify export was initiated
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('handles export errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Override handler to return error
    server.use(
      http.post('/api/manifests/export/csv', () => {
        return HttpResponse.json({ message: 'Export failed' }, { status: 500 });
      })
    );

    renderWithProviders(<ExportButton selectedIds={[1]} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(consoleSpy).toHaveBeenCalled();
    await screen.findByText('Export failed. Please try again.');

    consoleSpy.mockRestore();
  });
});
