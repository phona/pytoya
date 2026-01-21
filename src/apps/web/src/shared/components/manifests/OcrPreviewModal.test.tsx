import { describe, it, beforeEach, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { OcrPreviewModal } from './OcrPreviewModal';
import { useOcrResult, useTriggerOcr } from '@/shared/hooks/use-manifests';
import { useExtractionStore } from '@/shared/stores/extraction';

vi.mock('@/shared/hooks/use-manifests', () => ({
  useOcrResult: vi.fn(),
  useTriggerOcr: vi.fn(),
}));

vi.mock('@/shared/stores/extraction', () => ({
  useExtractionStore: vi.fn(),
}));

vi.mock('./PdfViewer', () => ({
  PdfViewer: () => <div>PDF Viewer</div>,
}));

const mockUseOcrResult = vi.mocked(useOcrResult);
const mockUseTriggerOcr = vi.mocked(useTriggerOcr);
const mockUseExtractionStore = vi.mocked(useExtractionStore);

describe('OcrPreviewModal', () => {
  const setOcrResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExtractionStore.mockReturnValue(setOcrResult);
  });

  it('renders text quality and raw text when available', async () => {
    mockUseOcrResult.mockReturnValue({
      data: {
        ocrResult: {
          pages: [
            { pageNumber: 1, text: 'Line 1', markdown: '', confidence: 0.9, layout: { elements: [], tables: [] } },
            { pageNumber: 2, text: 'Line 2', markdown: '', confidence: 0.9, layout: { elements: [], tables: [] } },
          ],
          metadata: {
            processedAt: '2025-01-01T00:00:00.000Z',
            modelVersion: 'PaddleOCR-VL',
            processingTimeMs: 1000,
          },
        },
        qualityScore: 95,
      },
      isLoading: false,
      error: null,
    } as any);

    mockUseTriggerOcr.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(
      <OcrPreviewModal manifestId={1} open={true} onClose={vi.fn()} />,
    );

    expect(screen.getByText('Text Preview')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('tab', { name: /Raw Text/i }));
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });

  it('triggers text extraction when not processed', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      ocrResult: { pages: [], metadata: { processedAt: '', modelVersion: '', processingTimeMs: 0 } },
    });

    mockUseOcrResult.mockReturnValue({
      data: { ocrResult: null, qualityScore: null },
      isLoading: false,
      error: null,
    } as any);

    mockUseTriggerOcr.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    render(
      <OcrPreviewModal manifestId={2} open={true} onClose={vi.fn()} />,
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('tab', { name: /Raw Text/i }));
    const button = screen.getByRole('button', { name: /Run Text Extraction/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ manifestId: 2 });
    });
  });
});
