import { ExtractionStrategy } from '@/api/schemas';
import { Badge } from '@/shared/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { cn } from '@/shared/lib/utils';

interface ExtractionStrategySelectorProps {
  value: ExtractionStrategy | null | undefined;
  onChange: (value: ExtractionStrategy | null) => void;
  disabled?: boolean;
  showCostEstimate?: boolean;
}

const STRATEGIES: {
  value: ExtractionStrategy;
  label: string;
  description: string;
  costEstimate: string;
  useCase: string;
}[] = [
  {
    value: ExtractionStrategy.OCR_FIRST,
    label: 'OCR First',
    description: 'Traditional OCR-based extraction',
    costEstimate: '$0.03 per 10 pages',
    useCase: 'Simple documents, low cost, high volume',
  },
  {
    value: ExtractionStrategy.VISION_ONLY,
    label: 'Vision Only',
    description: 'Direct image processing by LLM',
    costEstimate: '$0.30 per 10 pages',
    useCase: 'Complex layouts, handwritten text',
  },
  {
    value: ExtractionStrategy.VISION_FIRST,
    label: 'Vision First',
    description: 'Vision with OCR as context',
    costEstimate: '$0.35 per 10 pages',
    useCase: 'Mixed content, maximum accuracy',
  },
  {
    value: ExtractionStrategy.TWO_STAGE,
    label: 'Two Stage',
    description: 'Vision + OCR refinement',
    costEstimate: '$0.60 per 10 pages',
    useCase: 'Critical documents, verification required',
  },
];

export function ExtractionStrategySelector({
  value,
  onChange,
  disabled = false,
  showCostEstimate = true,
}: ExtractionStrategySelectorProps) {
  const helperId = 'extraction-strategy-help';

  return (
    <div>
      <label htmlFor="extractionStrategy" className="block text-sm font-medium text-foreground">
        Extraction Strategy
      </label>
      <ToggleGroup
        id="extractionStrategy"
        type="single"
        value={value ?? ''}
        onValueChange={(nextValue) =>
          onChange(nextValue ? (nextValue as ExtractionStrategy) : null)
        }
        className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        {STRATEGIES.map((strategy) => (
          <ToggleGroupItem
            key={strategy.value}
            value={strategy.value}
            disabled={disabled}
            className={cn(
              'h-auto items-start justify-start whitespace-normal rounded-md border border-border p-4 text-left',
              'data-[state=on]:border-primary data-[state=on]:bg-primary/5',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <div className="w-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{strategy.label}</span>
                {showCostEstimate && (
                  <Badge variant="secondary" className="text-xs">
                    {strategy.costEstimate}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{strategy.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Best for: {strategy.useCase}</p>
            </div>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {!value && (
        <p id={helperId} className="mt-2 text-xs text-muted-foreground">
          The system will automatically select the best strategy based on file type. PDFs use OCR-first, images use vision-only (if the LLM model supports it).
        </p>
      )}
    </div>
  );
}




