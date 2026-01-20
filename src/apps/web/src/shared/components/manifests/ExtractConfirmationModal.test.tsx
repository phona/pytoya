import { render, screen, fireEvent, waitFor, within, act } from '@/tests/utils';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ExtractConfirmationModal } from './ExtractConfirmationModal';

const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
  optionPattern: RegExp,
) => {
  await act(async () => {
    await user.click(screen.getByLabelText(label));
  });
  const listbox = await screen.findByRole('listbox');
  await act(async () => {
    const option = within(listbox).getAllByRole('option', { name: optionPattern })[0];
    fireEvent.pointerDown(option);
    fireEvent.click(option);
  });
  await waitFor(() => {
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
};

describe('ExtractConfirmationModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    manifestCount: 5,
    pageCount: 15,
    costEstimate: {
      currency: 'USD',
      estimatedCostMin: 0.02,
      estimatedCostMax: 0.035,
      estimatedTextCost: 0.005,
      estimatedLlmCostMin: 0.015,
      estimatedLlmCostMax: 0.03,
      estimatedTokensMin: 100000,
      estimatedTokensMax: 150000,
    },
    llmModels: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        pricing: {
          llm: {
            inputPrice: 2.5,
            outputPrice: 10.0,
            currency: 'USD',
          },
        },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        pricing: {
          llm: {
            inputPrice: 0.15,
            outputPrice: 0.60,
            currency: 'USD',
          },
        },
      },
    ],
    prompts: [
      { id: 1, name: 'Default Invoice Prompt' },
      { id: 2, name: 'Custom Extraction Prompt' },
    ],
    defaultLlmModelId: 'gpt-4o-mini',
    budget: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Extract 5 Documents')).toBeInTheDocument();
    expect(screen.getByText(/5 documents/)).toBeInTheDocument();
    expect(screen.getByText(/15 pages/)).toBeInTheDocument();
  });

  it('shows cost estimate breakdown', () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Cost Estimate')).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0050/)).toBeInTheDocument(); // Text cost
    expect(screen.getByText(/\$0\.0150 - \$0\.0300/)).toBeInTheDocument(); // LLM cost
    expect(screen.getByText(/\$0\.0200 - \$0\.0350/)).toBeInTheDocument(); // Total
  });

  it('displays model selector with pricing', async () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Model')).toBeInTheDocument();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await act(async () => {
      await user.click(screen.getByLabelText(/Model/i));
    });
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/\$2\.50 in \/ \$10\.00 out per 1M USD/)).toBeInTheDocument(); // GPT-4o pricing
    expect(within(listbox).getByText(/\$0\.15 in \/ \$0\.60 out per 1M USD/)).toBeInTheDocument(); // GPT-4o-mini pricing
  });

  it('allows model selection', async () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await selectOption(user, /Model/i, /^GPT-4o\s+\$2\.50/);

    await waitFor(() => {
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });
  });

  it('shows prompt template selector when prompts provided', () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    expect(screen.getByText(/Prompt Template/)).toBeInTheDocument();
  });

  it('allows prompt selection', async () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await selectOption(user, /Prompt Template/i, /Custom Extraction Prompt/);

    await waitFor(() => {
      expect(screen.getByText('Custom Extraction Prompt')).toBeInTheDocument();
    });
  });

  it('shows budget warning when over budget', () => {
    render(<ExtractConfirmationModal {...defaultProps} budget={0.02} />);

    expect(screen.getByText(/Warning.*will exceed your budget/)).toBeInTheDocument();
  });

  it('shows budget info when near budget', () => {
    render(<ExtractConfirmationModal {...defaultProps} budget={0.04} />);

    expect(screen.getByText(/Note: This will use .*% of your budget/)).toBeInTheDocument();
  });

  it('requires cost agreement checkbox before confirming', () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Start Extraction' });
    expect(confirmButton).toBeDisabled();
  });

  it('enables confirm button after checking agreement', async () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    const checkbox = screen.getByLabelText(/costs will be incurred/i);
    const confirmButton = screen.getByRole('button', { name: 'Start Extraction' });

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('calls onConfirm with selected options when confirmed', async () => {
    const onConfirm = vi.fn();
    render(<ExtractConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

    const checkbox = screen.getByLabelText(/costs will be incurred/i);
    const confirmButton = screen.getByRole('button', { name: 'Start Extraction' });

    fireEvent.click(checkbox);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        llmModelId: 'gpt-4o-mini',
        promptId: undefined,
      });
    });
  });

  it('calls onClose when cancelled', () => {
    const onClose = vi.fn();
    render(<ExtractConfirmationModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ExtractConfirmationModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows estimated tokens', () => {
    render(<ExtractConfirmationModal {...defaultProps} />);

    expect(screen.getByText(/Estimated tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/100,000/)).toBeInTheDocument();
    expect(screen.getByText(/150,000/)).toBeInTheDocument();
  });

  it('handles single manifest', () => {
    render(<ExtractConfirmationModal {...defaultProps} manifestCount={1} />);

    expect(screen.getByText('Extract Document')).toBeInTheDocument();
    expect(screen.getByText(/1 document/)).toBeInTheDocument();
  });

  it('handles no prompts gracefully', () => {
    render(<ExtractConfirmationModal {...defaultProps} prompts={[]} />);

    expect(screen.queryByText('Prompt Template')).not.toBeInTheDocument();
  });

  it('shows loading state when extracting', async () => {
    render(<ExtractConfirmationModal {...defaultProps} isExtracting={true} />);

    const checkbox = screen.getByLabelText(/costs will be incurred/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('Extracting...')).toBeInTheDocument();
    });
  });
});
