import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/tests/utils';
import {
  BatchValidationResultsModal,
  type BatchValidationResults,
} from './BatchValidationResultsModal';

describe('BatchValidationResultsModal', () => {
  const mockResults: BatchValidationResults = {
    manifestsWithErrors: [
      { id: 1, filename: 'error_file.pdf', errorCount: 3 },
      { id: 2, filename: 'another_error.pdf', errorCount: 1 },
    ],
    manifestsWithWarnings: [
      { id: 3, filename: 'warning_file.pdf', warningCount: 2 },
    ],
    manifestsPassed: [
      { id: 4, filename: 'passed_file.pdf' },
      { id: 5, filename: 'another_passed.pdf' },
    ],
    manifestsFailed: [
      { id: 6, filename: 'failed_file.pdf', error: 'Validation script error' },
    ],
    totalValidated: 6,
    totalErrors: 4,
    totalWarnings: 2,
  };

  it('renders summary with counts', () => {
    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    expect(screen.getByText('Batch validation complete')).toBeInTheDocument();
    // The validated count appears in both description and summary
    expect(screen.getAllByText('6 manifests validated').length).toBeGreaterThan(0);
    expect(screen.getByText('4 errors')).toBeInTheDocument();
    expect(screen.getByText('2 warnings')).toBeInTheDocument();
  });

  it('shows errors section expanded by default', () => {
    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    expect(screen.getByText('error_file.pdf')).toBeInTheDocument();
    expect(screen.getByText('another_error.pdf')).toBeInTheDocument();
  });

  it('shows has errors section with count', () => {
    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    expect(screen.getByText('Has Errors (2)')).toBeInTheDocument();
  });

  it('shows has warnings section with count', () => {
    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    expect(screen.getByText('Has Warnings (1)')).toBeInTheDocument();
  });

  it('shows passed section with count', () => {
    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    expect(screen.getByText('Passed (2)')).toBeInTheDocument();
  });

  it('shows failed section with count', () => {
    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    expect(screen.getByText('Failed (1)')).toBeInTheDocument();
  });

  it('calls onViewManifest when View button is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onViewManifest = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={onClose}
        results={mockResults}
        onViewManifest={onViewManifest}
      />,
    );

    // error_file.pdf is visible by default (errors section is expanded)
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    await user.click(viewButtons[0]);

    expect(onViewManifest).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Close button is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onClose = vi.fn();

    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={onClose}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    // Use getAllByRole and select the first one (footer close button)
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    await user.click(closeButtons[0]);

    expect(onClose).toHaveBeenCalled();
  });

  it('expands warnings section when clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    // Warnings section is collapsed by default
    expect(screen.queryByText('warning_file.pdf')).not.toBeInTheDocument();

    await user.click(screen.getByText('Has Warnings (1)'));

    expect(screen.getByText('warning_file.pdf')).toBeInTheDocument();
  });

  it('expands passed section when clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    // Passed section is collapsed by default
    expect(screen.queryByText('passed_file.pdf')).not.toBeInTheDocument();

    await user.click(screen.getByText('Passed (2)'));

    expect(screen.getByText('passed_file.pdf')).toBeInTheDocument();
    expect(screen.getByText('another_passed.pdf')).toBeInTheDocument();
  });

  it('shows failed validation error message', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={mockResults}
        onViewManifest={() => {}}
      />,
    );

    // Failed section is collapsed by default
    await user.click(screen.getByText('Failed (1)'));

    expect(screen.getByText('failed_file.pdf')).toBeInTheDocument();
    expect(screen.getByText('Validation script error')).toBeInTheDocument();
  });

  it('does not render when results is null', () => {
    const { container } = renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={null}
        onViewManifest={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles empty results', () => {
    const emptyResults: BatchValidationResults = {
      manifestsWithErrors: [],
      manifestsWithWarnings: [],
      manifestsPassed: [],
      manifestsFailed: [],
      totalValidated: 0,
      totalErrors: 0,
      totalWarnings: 0,
    };

    renderWithProviders(
      <BatchValidationResultsModal
        open={true}
        onClose={() => {}}
        results={emptyResults}
        onViewManifest={() => {}}
      />,
    );

    // The text appears twice (in description and summary), so use getAllByText
    expect(screen.getAllByText('0 manifests validated').length).toBeGreaterThan(0);
    // No sections should appear when there are no results
    expect(screen.queryByText(/Has Errors/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Has Warnings/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Passed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed/)).not.toBeInTheDocument();
  });
});
