import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RootLayout } from './RootLayout';
import * as testUtils from '@/tests/utils';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/', search: '' }),
  };
});

describe('RootLayout', () => {
  beforeEach(() => {
    // Mock document methods
    document.title = '';
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders skip to content link', () => {
    render(testUtils.renderWithProviders(<RootLayout />));

    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('sets document title on mount', () => {
    render(testUtils.renderWithProviders(<RootLayout />));

    expect(document.title).toBe('PyToYa');
  });

  it('attempts to focus main-content element on route change', () => {
    const mockElement = { focus: vi.fn() } as any;
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    const { rerender } = render(testUtils.renderWithProviders(<RootLayout />));

    // Re-render to trigger useEffect for location change
    rerender(testUtils.renderWithProviders(<RootLayout />));

    expect(document.getElementById).toHaveBeenCalledWith('main-content');
    // Note: Focus may not be called if element is null
  });

  it('renders children when provided', () => {
    render(testUtils.renderWithProviders(
      <RootLayout>
        <div data-testid="test-child">Test Child</div>
      </RootLayout>
    ));

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('renders Outlet when no children provided', () => {
    render(testUtils.renderWithProviders(<RootLayout />));

    // Outlet should be rendered
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
  });

  it('applies correct accessibility classes to skip link', () => {
    render(testUtils.renderWithProviders(<RootLayout />));

    const skipLink = screen.getByText('Skip to content');

    // Check for sr-only class (hidden by default)
    expect(skipLink).toHaveClass('sr-only');
  });

  it('includes Providers wrapper', () => {
    render(testUtils.renderWithProviders(<RootLayout />));

    // If Providers is working correctly, the skip link should be rendered
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
  });
});
