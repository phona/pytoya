import { renderWithProviders, screen, fireEvent } from '@/tests/utils';
import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ManifestFilters } from './ManifestFilters';

describe('ManifestFilters', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('adds a dynamic field filter', () => {
    const handleChange = vi.fn();

    renderWithProviders(
      <ManifestFilters values={{}} onChange={handleChange} manifestCount={0} />,
    );

    fireEvent.change(screen.getByLabelText('Field path'), {
      target: { value: 'invoice.po_no' },
    });
    fireEvent.change(screen.getByLabelText('Field value'), {
      target: { value: '0000009' },
    });

    fireEvent.click(screen.getByText('Add Field Filter'));

    expect(handleChange).toHaveBeenCalledWith({
      dynamicFilters: [{ field: 'invoice.po_no', value: '0000009' }],
    });
  });
});




