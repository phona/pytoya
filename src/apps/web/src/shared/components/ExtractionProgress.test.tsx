import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExtractionProgress, type ExtractionProgressData } from './ExtractionProgress';

const createMockData = (overrides?: Partial<ExtractionProgressData>): ExtractionProgressData => ({
  strategy: 'ocr-first',
  stages: [
    { name: 'OCR Processing', progress: 100, status: 'completed' },
    { name: 'Data Extraction', progress: 50, status: 'processing' },
  ],
  overallProgress: 75,
  status: 'processing',
  ...overrides,
});

describe('ExtractionProgress', () => {
  it('returns null when no data provided', () => {
    const { container } = render(<ExtractionProgress data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overall progress bar', () => {
    const data = createMockData();
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays strategy label', () => {
    const data = createMockData({ strategy: 'ocr-first' });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('Ocr First')).toBeInTheDocument();
    expect(screen.getByText('Extraction Strategy')).toBeInTheDocument();
  });

  it('renders all stages for ocr-first strategy', () => {
    const data = createMockData({
      strategy: 'ocr-first',
      stages: [
        { name: 'OCR Processing', progress: 100, status: 'completed' },
        { name: 'Data Extraction', progress: 50, status: 'processing' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('OCR Processing')).toBeInTheDocument();
    expect(screen.getByText('Data Extraction')).toBeInTheDocument();
    expect(screen.getByText('Extracting text from document')).toBeInTheDocument();
    expect(screen.getByText('Extracting structured data')).toBeInTheDocument();
  });

  it('renders all stages for vision-only strategy', () => {
    const data = createMockData({
      strategy: 'vision-only',
      stages: [
        { name: 'PDF Conversion', progress: 100, status: 'completed' },
        { name: 'Vision Extraction', progress: 0, status: 'pending' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('PDF Conversion')).toBeInTheDocument();
    expect(screen.getByText('Converting pages to images')).toBeInTheDocument();
  });

  it('renders all stages for vision-first strategy', () => {
    const data = createMockData({
      strategy: 'vision-first',
      stages: [
        { name: 'PDF Conversion', progress: 100, status: 'completed' },
        { name: 'OCR Processing', progress: 50, status: 'processing' },
        { name: 'Vision Extraction', progress: 0, status: 'pending' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('PDF Conversion')).toBeInTheDocument();
    expect(screen.getByText('OCR Processing')).toBeInTheDocument();
    expect(screen.getByText('Vision Extraction')).toBeInTheDocument();
  });

  it('renders all stages for two-stage strategy', () => {
    const data = createMockData({
      strategy: 'two-stage',
      stages: [
        { name: 'PDF Conversion', progress: 100, status: 'completed' },
        { name: 'Stage 1: Vision', progress: 50, status: 'processing' },
        { name: 'Stage 2: OCR Refinement', progress: 0, status: 'pending' },
        { name: 'Merging Results', progress: 0, status: 'pending' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('PDF Conversion')).toBeInTheDocument();
    expect(screen.getByText('Stage 1: Vision')).toBeInTheDocument();
    expect(screen.getByText('Stage 2: OCR Refinement')).toBeInTheDocument();
    expect(screen.getByText('Merging Results')).toBeInTheDocument();
  });

  it('displays stage error message', () => {
    const data = createMockData({
      stages: [
        { name: 'OCR Processing', progress: 50, status: 'failed', error: 'OCR engine failed' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getAllByText('OCR engine failed').length).toBeGreaterThan(0);
  });

  it('displays overall error when no stage errors', () => {
    const data = createMockData({
      error: 'Extraction failed: Invalid document format',
      stages: [
        { name: 'OCR Processing', progress: 50, status: 'failed' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getAllByText('Extraction failed: Invalid document format').length).toBeGreaterThan(0);
  });

  it('displays strategy-specific info messages', () => {
    const twoStageData = createMockData({ strategy: 'two-stage' });
    const { rerender } = render(<ExtractionProgress data={twoStageData} />);

    expect(screen.getByText(/Two-stage extraction combines vision and OCR/)).toBeInTheDocument();

    const ocrFirstData = createMockData({ strategy: 'ocr-first' });
    rerender(<ExtractionProgress data={ocrFirstData} />);

    expect(screen.getByText(/OCR-first extraction uses traditional text extraction/)).toBeInTheDocument();
  });

  it('displays stage status badges', () => {
    const data = createMockData({
      strategy: 'two-stage',
      stages: [
        { name: 'Completed Stage', progress: 100, status: 'completed' },
        { name: 'Processing Stage', progress: 50, status: 'processing' },
        { name: 'Pending Stage', progress: 0, status: 'pending' },
        { name: 'Failed Stage', progress: 25, status: 'failed', error: 'Test error' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('displays stage progress percentages', () => {
    const data = createMockData({
      stages: [
        { name: 'Stage 1', progress: 45, status: 'processing' },
      ],
    });
    render(<ExtractionProgress data={data} />);

    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('uses default ocr-first config for unknown strategy', () => {
    const data = createMockData({ strategy: 'unknown' as any });
    render(<ExtractionProgress data={data} />);

    // Should fall back to ocr-first stages
    expect(screen.getByText('OCR Processing')).toBeInTheDocument();
  });
});
