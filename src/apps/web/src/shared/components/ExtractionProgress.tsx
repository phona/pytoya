import { ProgressBar } from './manifests/ProgressBar';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';

export interface ExtractionStage {
  name: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ExtractionProgressData {
  strategy: string;
  stages: ExtractionStage[];
  overallProgress: number;
  status: string;
  error?: string;
}

interface ExtractionProgressProps {
  data: ExtractionProgressData | null;
}

const STAGE_CONFIGS: Record<string, { label: string; description: string }[]> = {
  'ocr-first': [
    { label: 'OCR Processing', description: 'Extracting text from document' },
    { label: 'Data Extraction', description: 'Extracting structured data' },
  ],
  'vision-only': [
    { label: 'PDF Conversion', description: 'Converting pages to images' },
    { label: 'Vision Extraction', description: 'Processing images with AI' },
  ],
  'vision-first': [
    { label: 'PDF Conversion', description: 'Converting pages to images' },
    { label: 'OCR Processing', description: 'Extracting text for context' },
    { label: 'Vision Extraction', description: 'Processing images with AI' },
  ],
  'two-stage': [
    { label: 'PDF Conversion', description: 'Converting pages to images' },
    { label: 'Stage 1: Vision', description: 'Initial vision extraction' },
    { label: 'Stage 2: OCR Refinement', description: 'Refining with OCR data' },
    { label: 'Merging Results', description: 'Combining extraction results' },
  ],
};

export function ExtractionProgress({ data }: ExtractionProgressProps) {
  if (!data) {
    return null;
  }

  const stageConfigs = STAGE_CONFIGS[data.strategy] || STAGE_CONFIGS['ocr-first'];

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Overall Progress</span>
          <span className="text-xs text-muted-foreground">{data.overallProgress}%</span>
        </div>
        <ProgressBar
          progress={data.overallProgress}
          status={data.status}
          error={data.error}
          size="md"
          showLabel={false}
          showStatus={false}
        />
      </div>

      {/* Strategy Label */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
          {data.strategy.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        <span className="text-xs text-muted-foreground">Extraction Strategy</span>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-foreground">Processing Stages</span>
        {stageConfigs.map((config, index) => {
          const stage = data.stages[index] || { name: config.label, progress: 0, status: 'pending' as const };

          return (
            <div key={index} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                    <StageStatusBadge status={stage.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{stage.progress}%</span>
              </div>

              {/* Stage Progress Bar */}
              <ProgressBar
                progress={stage.progress}
                status={stage.status}
                error={stage.error}
                size="sm"
                showLabel={false}
                showStatus={false}
              />

              {/* Stage Error */}
              {stage.error && (
                <p className="mt-2 text-xs text-destructive">{stage.error}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Error */}
      {data.error && !data.stages.some(s => s.error) && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-sm text-destructive">{data.error}</p>
        </div>
      )}

      {/* Info Message */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
        <p className="text-xs text-primary">
          {data.strategy === 'two-stage' && 'Two-stage extraction combines vision and OCR for maximum accuracy. This may take longer than single-stage methods.'}
          {data.strategy === 'vision-first' && 'Vision-first extraction uses OCR text as context to improve vision-based extraction accuracy.'}
          {data.strategy === 'vision-only' && 'Vision-only extraction processes images directly with AI, ideal for complex layouts and handwritten text.'}
          {data.strategy === 'ocr-first' && 'OCR-first extraction uses traditional text extraction, the fastest and most cost-effective method.'}
        </p>
      </div>
    </div>
  );
}

function StageStatusBadge({ status }: { status: ExtractionStage['status'] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const className = getStatusBadgeClasses(status);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}




