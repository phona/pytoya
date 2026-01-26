import { renderWithProviders, screen, waitFor, act, fireEvent, within } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ExtractorsPage } from './ExtractorsPage';
import { server } from '@/tests/mocks/server';

const click = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
  await act(async () => {
    await user.click(element);
  });
};

const type = async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) => {
  await act(async () => {
    await user.type(element, text);
  });
};

const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
  optionText: string,
) => {
  await act(async () => {
    await user.click(screen.getByLabelText(label));
  });
  const listbox = await screen.findByRole('listbox');
  await act(async () => {
    const option = within(listbox).getByRole('option', { name: optionText });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
  });
  await waitFor(() => {
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'PaddleOCR VL' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/0\.24 USD/).length).toBeGreaterThan(0);
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

  it('creates an extractor via UI', async () => {
    const user = userEvent.setup();
    let received: Record<string, unknown> = {};

    server.use(
      http.post('/api/extractors', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 'extractor-new',
          name: received.name ?? 'New Extractor',
          description: received.description ?? null,
          extractorType: received.extractorType ?? 'vision-llm',
          config: received.config ?? {},
          isActive: received.isActive ?? true,
          usageCount: 0,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        });
      }),
    );

    await act(async () => {
      renderWithProviders(<ExtractorsPage />);
    });

    await screen.findByText('Vision LLM - GPT-4o');
    await click(user, screen.getByRole('button', { name: /New Extractor/i }));

    await type(user, screen.getByLabelText(/Name/i), 'New Extractor');
    await type(user, screen.getByLabelText(/Base URL/i), 'https://api.openai.com/v1');
    await type(user, screen.getByLabelText(/API Key/i), 'sk-test');
    await type(user, screen.getByLabelText(/^Model\b/i), 'gpt-4o');

    await selectOption(user, /Pricing Mode/i, 'token');
    await selectOption(user, /Currency/i, 'USD');
    await type(user, screen.getByLabelText(/Input Price/i), '2.5');
    await type(user, screen.getByLabelText(/Output Price/i), '10');

    await click(user, screen.getByRole('button', { name: /Create Extractor/i }));

    await waitFor(() => {
      expect(received).toMatchObject({
        name: 'New Extractor',
        extractorType: 'vision-llm',
        config: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          model: 'gpt-4o',
          pricing: {
            mode: 'token',
            currency: 'USD',
            inputPricePerMillionTokens: 2.5,
            outputPricePerMillionTokens: 10,
          },
        },
      });
    });
  }, 15000);
});
