import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ExtractionStrategySelector } from './ExtractionStrategySelector';
import { ExtractionStrategy } from '@/api/schemas';

describe('ExtractionStrategySelector', () => {
  it('renders all strategy options', () => {
    render(
      <ExtractionStrategySelector
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Extraction Strategy')).toBeInTheDocument();
    expect(screen.getByText('OCR First')).toBeInTheDocument();
    expect(screen.getByText('Vision Only')).toBeInTheDocument();
    expect(screen.getByText('Vision First')).toBeInTheDocument();
    expect(screen.getByText('Two Stage')).toBeInTheDocument();
  });

  it('shows cost estimates by default', () => {
    render(
      <ExtractionStrategySelector
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('$0.03 per 10 pages')).toBeInTheDocument();
    expect(screen.getByText('$0.30 per 10 pages')).toBeInTheDocument();
  });

  it('hides cost estimates when showCostEstimate is false', () => {
    render(
      <ExtractionStrategySelector
        value={null}
        onChange={vi.fn()}
        showCostEstimate={false}
      />
    );

    expect(screen.queryByText('$0.03 per 10 pages')).not.toBeInTheDocument();
  });

  it('calls onChange when strategy is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ExtractionStrategySelector
        value={null}
        onChange={onChange}
      />
    );

    const ocrFirstButton = screen.getByText('OCR First').closest('button');
    if (!ocrFirstButton) throw new Error('Button not found');

    await user.click(ocrFirstButton);

    expect(onChange).toHaveBeenCalledWith(ExtractionStrategy.OCR_FIRST);
  });

  it('disables all options when disabled prop is true', () => {
    render(
      <ExtractionStrategySelector
        value={null}
        onChange={vi.fn()}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole('radio');
    buttons.forEach(button => {
      expect(button).toHaveClass('pointer-events-none');
    });
  });

  it('shows helper text when no strategy is selected', () => {
    render(
      <ExtractionStrategySelector
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/The system will automatically select/)).toBeInTheDocument();
  });

  it('hides helper text when strategy is selected', () => {
    render(
      <ExtractionStrategySelector
        value={ExtractionStrategy.OCR_FIRST}
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByText(/The system will automatically select/)).not.toBeInTheDocument();
  });

  it('displays strategy descriptions', () => {
    render(
      <ExtractionStrategySelector
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Traditional OCR-based extraction')).toBeInTheDocument();
    expect(screen.getByText('Direct image processing by LLM')).toBeInTheDocument();
    expect(screen.getByText('Vision with OCR as context')).toBeInTheDocument();
    expect(screen.getByText('Vision + OCR refinement')).toBeInTheDocument();
  });
});
