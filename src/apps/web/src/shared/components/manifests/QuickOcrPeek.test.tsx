import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { QuickOcrPeek } from './QuickOcrPeek';
import { useOcrResult } from '@/shared/hooks/use-manifests';

vi.mock('@/shared/hooks/use-manifests', () => ({
  useOcrResult: vi.fn(),
}));

const mockUseOcrResult = vi.mocked(useOcrResult);

describe('QuickOcrPeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseOcrResult.mockReturnValue({
      data: {
        ocrResult: {
          document: { type: 'invoice', pages: 1 },
          pages: [{ text: 'Sample OCR text' }],
          visionAnalysis: {
            detectedFields: [{ field: 'po_no', value: '0000001', confidence: 0.9 }],
          },
        },
        qualityScore: 92,
      },
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows OCR peek content on hover', async () => {
    const onViewFull = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, pointerEventsCheck: 0 });

    render(
      <QuickOcrPeek manifestId={1} onViewFull={onViewFull}>
        <button type="button">Preview</button>
      </QuickOcrPeek>,
    );

    const trigger = screen.getByRole('button', { name: 'Preview' });
    await user.hover(trigger);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('OCR Peek')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText(/Sample OCR text/i)).toBeInTheDocument();

    const viewButton = screen.getByRole('button', { name: /View Full OCR/i });
    fireEvent.click(viewButton);
    expect(onViewFull).toHaveBeenCalledTimes(1);
  });
});
