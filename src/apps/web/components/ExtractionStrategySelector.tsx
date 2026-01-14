import { ExtractionStrategy } from '@/lib/api/schemas';

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
    value: 'ocr-first',
    label: 'OCR First',
    description: 'Traditional OCR-based extraction',
    costEstimate: '$0.03 per 10 pages',
    useCase: 'Simple documents, low cost, high volume',
  },
  {
    value: 'vision-only',
    label: 'Vision Only',
    description: 'Direct image processing by LLM',
    costEstimate: '$0.30 per 10 pages',
    useCase: 'Complex layouts, handwritten text',
  },
  {
    value: 'vision-first',
    label: 'Vision First',
    description: 'Vision with OCR as context',
    costEstimate: '$0.35 per 10 pages',
    useCase: 'Mixed content, maximum accuracy',
  },
  {
    value: 'two-stage',
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
  return (
    <div>
      <label htmlFor="extractionStrategy" className="block text-sm font-medium text-gray-700">
        Extraction Strategy
      </label>
      <select
        id="extractionStrategy"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as ExtractionStrategy))}
        disabled={disabled}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Auto-select (based on file type)</option>
        {STRATEGIES.map((strategy) => (
          <option key={strategy.value} value={strategy.value}>
            {strategy.label} - {strategy.description}
          </option>
        ))}
      </select>
      {value && showCostEstimate && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-blue-800">
                {STRATEGIES.find(s => s.value === value)?.label}
              </h4>
              <div className="mt-1 text-sm text-blue-700">
                <p className="font-medium">Estimate: {STRATEGIES.find(s => s.value === value)?.costEstimate}</p>
                <p className="text-xs mt-1">Best for: {STRATEGIES.find(s => s.value === value)?.useCase}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {!value && (
        <p className="mt-1 text-xs text-gray-500">
          The system will automatically select the best strategy based on file type. PDFs use OCR-first, images use vision-only (if provider supports it).
        </p>
      )}
    </div>
  );
}
