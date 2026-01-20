import { renderWithProviders, screen, waitFor, act } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { ExtractorsPage } from './ExtractorsPage';
import { server } from '@/tests/mocks/server';

const click = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.click(element);
  });
};

describe('ExtractorsPage', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders extractors and total spend', async () => {
    await act(async () => {
      renderWithProviders(<ExtractorsPage />);
    });

    await screen.findByText('Vision LLM - GPT-4o');
    expect(screen.getByText('PaddleOCR VL')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('$0.2400')).toBeInTheDocument();
    });
  });

  it('shows validation errors when creating with missing fields', async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderWithProviders(<ExtractorsPage />);
    });

    await screen.findByText('Vision LLM - GPT-4o');
    await click(user, screen.getByRole('button', { name: /New Extractor/i }));
    await click(user, screen.getByRole('button', { name: /Create Extractor/i }));

    await waitFor(() => {
      expect(screen.getByText('Extractor name is required')).toBeInTheDocument();
    });
  });
});
