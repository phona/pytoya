import { render, screen, fireEvent } from '@/tests/utils';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { ExtractionProgressView } from './ExtractionProgressView';

describe('ExtractionProgressView', () => {
  const mockJobs = [
    {
      id: '1',
      manifestId: 1,
      manifestName: 'invoice_001.pdf',
      status: 'completed' as const,
      progress: 100,
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(Date.now() - 30000),
      cost: { ocr: 0.003, llm: 0.067, total: 0.07 },
      pages: 3,
    },
    {
      id: '2',
      manifestId: 2,
      manifestName: 'invoice_002.pdf',
      status: 'running' as const,
      progress: 45,
      startedAt: new Date(Date.now() - 10000),
      cost: { ocr: 0, llm: 0, total: 0 },
    },
    {
      id: '3',
      manifestId: 3,
      manifestName: 'invoice_003.pdf',
      status: 'pending' as const,
      progress: 0,
    },
  ];

  const defaultProps = {
    jobs: mockJobs,
    totalJobs: 5,
    onComplete: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    isPaused: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress view with title', () => {
    render(<ExtractionProgressView {...defaultProps} />);

    expect(screen.getByText('Bulk Extraction in Progress')).toBeInTheDocument();
  });

  it('displays overall progress bar', () => {
    render(<ExtractionProgressView {...defaultProps} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 5 documents/)).toBeInTheDocument();
  });

  it('shows current document being processed', () => {
    render(<ExtractionProgressView {...defaultProps} />);

    expect(screen.getByText('Current:')).toBeInTheDocument();
    expect(screen.getByText('invoice_002.pdf')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('displays speed and ETA when enough jobs completed', () => {
    const jobsWithHistory = [
      {
        id: '1',
        manifestId: 1,
        manifestName: 'doc1.pdf',
        status: 'completed' as const,
        progress: 100,
        startedAt: new Date(Date.now() - 120000),
        completedAt: new Date(Date.now() - 60000),
        cost: { ocr: 0.003, llm: 0.067, total: 0.07 },
        pages: 3,
      },
      {
        id: '2',
        manifestId: 2,
        manifestName: 'doc2.pdf',
        status: 'completed' as const,
        progress: 100,
        startedAt: new Date(Date.now() - 60000),
        completedAt: new Date(Date.now() - 30000),
        cost: { ocr: 0.003, llm: 0.047, total: 0.05 },
        pages: 2,
      },
    ];

    render(<ExtractionProgressView {...defaultProps} jobs={jobsWithHistory} totalJobs={5} />);

    expect(screen.getByText(/Speed:/)).toBeInTheDocument();
    expect(screen.getByText(/ETA:/)).toBeInTheDocument();
  });

  it('shows cost tracker with OCR and LLM breakdown', () => {
    render(<ExtractionProgressView {...defaultProps} />);

    expect(screen.getByText('Cost Tracker')).toBeInTheDocument();
    expect(screen.getByText('OCR')).toBeInTheDocument();
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('displays budget progress when budget provided', () => {
    render(<ExtractionProgressView {...defaultProps} budget={1} />);

    expect(screen.getByText(/Budget:/)).toBeInTheDocument();
    expect(screen.getAllByText(/\$0\.07/).length).toBeGreaterThan(0); // Total cost so far
  });

  it('shows projected total cost', () => {
    const jobsWithCost = [
      {
        id: '1',
        manifestId: 1,
        manifestName: 'doc1.pdf',
        status: 'completed' as const,
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        cost: { ocr: 0.003, llm: 0.067, total: 0.07 },
        pages: 3,
      },
    ];

    render(<ExtractionProgressView {...defaultProps} jobs={jobsWithCost} totalJobs={3} />);

    expect(screen.getByText(/Projected total:/)).toBeInTheDocument();
  });

  it('displays live queue with status badges', () => {
    render(<ExtractionProgressView {...defaultProps} />);

    expect(screen.getByText('Live Queue')).toBeInTheDocument();
    expect(screen.getByText(/invoice_001/)).toBeInTheDocument();
    expect(screen.getAllByText(/invoice_002/).length).toBeGreaterThan(0);
  });

  it('shows pause button when not paused', () => {
    render(<ExtractionProgressView {...defaultProps} isPaused={false} />);

    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resume/i })).not.toBeInTheDocument();
  });

  it('shows resume button when paused', () => {
    render(<ExtractionProgressView {...defaultProps} isPaused={true} />);

    expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pause/i })).not.toBeInTheDocument();
  });

  it('calls onPause when pause button clicked', () => {
    const onPause = vi.fn();
    render(<ExtractionProgressView {...defaultProps} onPause={onPause} isPaused={false} />);

    const pauseButton = screen.getByRole('button', { name: /Pause/i });
    fireEvent.click(pauseButton);

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when stop button clicked', () => {
    const onStop = vi.fn();
    render(<ExtractionProgressView {...defaultProps} onStop={onStop} />);

    const stopButton = screen.getByRole('button', { name: /Stop/i });
    fireEvent.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when close button clicked', () => {
    const onComplete = vi.fn();
    render(<ExtractionProgressView {...defaultProps} onComplete={onComplete} />);

    const closeButton = screen.getByRole('button', { name: '' }); // X icon
    fireEvent.click(closeButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows run in background button when provided', () => {
    const onRunInBackground = vi.fn();
    render(<ExtractionProgressView {...defaultProps} onRunInBackground={onRunInBackground} />);

    const button = screen.getByRole('button', { name: 'Run in Background' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onRunInBackground).toHaveBeenCalledTimes(1);
  });

  it('displays summary stats at bottom', () => {
    render(<ExtractionProgressView {...defaultProps} />);

    expect(screen.getByText(/1 complete/)).toBeInTheDocument();
    expect(screen.getByText(/0 failed/)).toBeInTheDocument();
    expect(screen.getByText(/1 pending/)).toBeInTheDocument();
  });

  it('handles empty jobs array', () => {
    render(<ExtractionProgressView {...defaultProps} jobs={[]} totalJobs={0} />);

    expect(screen.getByText(/0 \/ 0 documents/)).toBeInTheDocument();
  });
});
