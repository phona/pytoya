import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/utils';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders accessible controls and handles page changes', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    renderWithProviders(
      <Pagination
        currentPage={1}
        totalPages={3}
        pageSize={25}
        totalItems={60}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    const previousButton = screen.getByRole('button', { name: /previous page/i });
    const nextButton = screen.getByRole('button', { name: /next page/i });

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);

    const pageSizeSelect = screen.getByLabelText(/per page/i);
    await user.click(pageSizeSelect);
    await user.click(screen.getByRole('option', { name: '50' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});




