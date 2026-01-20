import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/tests/utils';
import { ExtractorCard } from './ExtractorCard';

describe('ExtractorCard', () => {
  const extractor = {
    id: 'extractor-1',
    name: 'Vision LLM',
    description: 'OpenAI vision extractor',
    extractorType: 'vision-llm',
    config: {
      model: 'gpt-4o',
      pricing: { currency: 'USD' },
    },
    isActive: true,
    usageCount: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const costSummary = {
    extractorId: 'extractor-1',
    extractorName: 'Vision LLM',
    totalExtractions: 3,
    totalCost: 0.12,
    averageCostPerExtraction: 0.04,
    currency: 'USD',
    costBreakdown: { byDate: [], byProject: [] },
  };

  it('renders extractor details and cost summary', () => {
    render(<ExtractorCard extractor={extractor as any} costSummary={costSummary as any} />);

    expect(screen.getByText('Vision LLM')).toBeInTheDocument();
    expect(screen.getByText('OpenAI vision extractor')).toBeInTheDocument();
    expect(screen.getByText('vision-llm')).toBeInTheDocument();
    expect(screen.getByText('Avg cost')).toBeInTheDocument();
    expect(screen.getByText('Total spend')).toBeInTheDocument();
    expect(screen.getByText('3 extractions')).toBeInTheDocument();
  });

  it('fires action callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onTest = vi.fn();

    render(
      <ExtractorCard
        extractor={extractor as any}
        costSummary={costSummary as any}
        onEdit={onEdit}
        onDelete={onDelete}
        onTest={onTest}
      />,
    );

    fireEvent.click(screen.getByLabelText('Extractor actions'));
    fireEvent.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledWith(extractor);
  });
});
