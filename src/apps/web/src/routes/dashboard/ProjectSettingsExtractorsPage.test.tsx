import { act, renderWithProviders, screen, waitFor } from '@/tests/utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/tests/mocks/server';
import { ProjectSettingsExtractorsPage } from './ProjectSettingsExtractorsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '1' }),
  };
});

describe('ProjectSettingsExtractorsPage', () => {
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

  it('shows current extractor details', async () => {
    await act(async () => {
      renderWithProviders(<ProjectSettingsExtractorsPage />, { route: '/projects/1/settings/extractors' });
    });

    await waitFor(() => {
      expect(screen.getByText('Extractor Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Vision LLM - GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('vision-llm')).toBeInTheDocument();
  });
});
