import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { FieldReExtractDialog } from './FieldReExtractDialog';
import { useReExtractFieldPreview } from '@/shared/hooks/use-manifests';
import { useModels } from '@/shared/hooks/use-models';
import { usePrompts } from '@/shared/hooks/use-prompts';

vi.mock('@/shared/hooks/use-manifests', () => ({
  useReExtractFieldPreview: vi.fn(),
}));

vi.mock('@/shared/hooks/use-models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@/shared/hooks/use-prompts', () => ({
  usePrompts: vi.fn(),
}));

const mockUseReExtractFieldPreview = vi.mocked(useReExtractFieldPreview);
const mockUseModels = vi.mocked(useModels);
const mockUsePrompts = vi.mocked(usePrompts);

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
    const option = within(listbox).getByRole('option', { name: new RegExp(optionText) });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
  });
  await waitFor(() => {
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
};

describe('FieldReExtractDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseModels.mockReturnValue({
      models: [
        {
          id: 'llm-1',
          name: 'GPT-4o Mini',
          adapterType: 'openai',
          pricing: {
            llm: { inputPrice: 0.15, outputPrice: 0.6, currency: 'USD' },
          },
          isActive: true,
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    mockUsePrompts.mockReturnValue({
      prompts: [{ id: 1, name: 'Default Prompt' }],
      isLoading: false,
      error: null,
    } as any);
  });

  it('previews field re-extraction and shows cost estimate', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      ocrPreview: { snippet: 'Invoice #001' },
      estimatedCost: 0.0123,
      currency: 'USD',
    });

    mockUseReExtractFieldPreview.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <FieldReExtractDialog
        open={true}
        onClose={vi.fn()}
        manifestId={10}
        fieldName="invoice.po_no"
        currentValue="0000001"
      />,
    );

    await selectOption(user, /LLM Model/i, 'GPT-4o Mini');

    const previewButton = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        manifestId: 10,
        data: {
          fieldName: 'invoice.po_no',
          llmModelId: 'llm-1',
          promptId: undefined,
          customPrompt: undefined,
          includeOcrContext: undefined,
          previewOnly: true,
        },
      });
    });

    expect(screen.getByText('$0.0123')).toBeInTheDocument();
  });
});
