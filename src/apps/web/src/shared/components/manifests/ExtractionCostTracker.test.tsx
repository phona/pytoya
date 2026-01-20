import { render, screen } from '@/tests/utils';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { ExtractionCostTracker } from './ExtractionCostTracker';

// Mock the useExtractionStore hook
const mockState = {
  cost: {
    total: 3,
    text: 1,
    llm: 2,
  },
};

vi.mock('@/shared/stores/extraction', () => ({
  useExtractionStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe('ExtractionCostTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cost tracker with breakdown', () => {
    render(<ExtractionCostTracker budget={50} />);

    expect(screen.getByText('Cost Tracker')).toBeInTheDocument();
    expect(screen.getByText(/Budget Used/)).toBeInTheDocument();
  });

  it('displays budget progress when budget is provided', () => {
    render(<ExtractionCostTracker budget={50} />);

    expect(screen.getByText(/\$3\.00 \/ \$50\.00/)).toBeInTheDocument();
  });

  it('shows cost breakdown for text, LLM, and total', () => {
    render(<ExtractionCostTracker budget={50} />);

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText(/^\$1\.00$/)).toBeInTheDocument();
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText(/^\$2\.00$/)).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/^\$3\.00$/)).toBeInTheDocument();
  });

  it('displays average cost per document', () => {
    render(<ExtractionCostTracker budget={50} />);

    expect(screen.getByText('Average per document')).toBeInTheDocument();
    expect(screen.getByText(/\$1\.0000/)).toBeInTheDocument();
  });

  it('shows detailed log link button', () => {
    const onViewDetails = vi.fn();
    render(<ExtractionCostTracker budget={50} onViewDetails={onViewDetails} />);

    const button = screen.getByRole('button', { name: /view details/i });
    expect(button).toBeInTheDocument();

    button.click();
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('defaults to the standard budget when none is provided', () => {
    render(<ExtractionCostTracker />);

    expect(screen.getByText(/\$3\.00 \/ \$50\.00/)).toBeInTheDocument();
  });

  it('shows warning when approaching budget limit', () => {
    render(<ExtractionCostTracker budget={3.5} />);

    // $3.00 out of $3.50 is > 80%, should show warning
    expect(screen.getByText(/Near budget/i)).toBeInTheDocument();
  });

  it('shows error when over budget', () => {
    render(<ExtractionCostTracker budget={2.5} />);

    // $3.00 > $2.50, over budget
    expect(screen.getByText(/Over budget/i)).toBeInTheDocument();
  });
});
