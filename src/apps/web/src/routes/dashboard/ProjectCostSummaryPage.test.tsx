import { act, renderWithProviders, screen, waitFor } from '@/tests/utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectCostSummaryPage } from './ProjectCostSummaryPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

describe('ProjectCostSummaryPage', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    navigateMock.mockClear();
  });

  afterAll(() => {
    server.close();
  });

  it('renders cost summary data', async () => {
    await act(async () => {
      renderWithProviders(<ProjectCostSummaryPage />, { route: '/projects/1/costs' });
    });

    await waitFor(() => {
      expect(screen.getByText('Project Cost Summary')).toBeInTheDocument();
    });

    expect(screen.getAllByText('$0.2500').length).toBeGreaterThan(0);
  });
});
