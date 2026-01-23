import { describe, it, beforeEach, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { OcrPreviewModal } from './OcrPreviewModal';
import { useOcrResult } from '@/shared/hooks/use-manifests';

vi.mock('@/shared/hooks/use-manifests', () => ({
  useOcrResult: vi.fn(),
}));

vi.mock('./PdfViewer', () => ({
  PdfViewer: () => <div>PDF Viewer</div>,
}));

const mockUseOcrResult = vi.mocked(useOcrResult);

describe('OcrPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    renderWithProviders(
      <OcrPreviewModal manifestId={1} open={true} onClose={vi.fn()} />,
    );

    expect(screen.getByText('Text Preview')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('tab', { name: /Raw Text/i }));
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });

  it('does not offer manual OCR trigger when not processed', async () => {
    mockUseOcrResult.mockReturnValue({
      data: { ocrResult: null, qualityScore: null },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(
      <OcrPreviewModal manifestId={2} open={true} onClose={vi.fn()} />,
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('tab', { name: /Raw Text/i }));
    expect(screen.queryByRole('button', { name: /Run Text Extraction/i })).toBeNull();
  });
});
