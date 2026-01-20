import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useOcrResult } from '@/shared/hooks/use-manifests';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

interface QuickOcrPeekProps {
  manifestId: number;
  children: React.ReactNode;
  onViewFull?: () => void;
}

const getQualityLabel = (score?: number | null) => {
  if (score === null || score === undefined) return 'Not processed';
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  return 'Poor';
};

export function QuickOcrPeek({ manifestId, children, onViewFull }: QuickOcrPeekProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOcrResult(manifestId, open);
  const ocrResult = data?.ocrResult ?? null;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={500} closeDelay={150}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">OCR Peek</div>
          <Badge className="bg-muted text-muted-foreground">
            {getQualityLabel(data?.qualityScore ?? null)}
          </Badge>
        </div>

        {isLoading && <p className="text-xs text-muted-foreground">Loading OCR...</p>}
        {!isLoading && !ocrResult && (
          <p className="text-xs text-muted-foreground">OCR not processed yet.</p>
        )}
        {ocrResult && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Document:</span>{' '}
              {ocrResult.document?.type ?? 'Unknown'} ({ocrResult.document?.pages ?? 0} pages)
            </div>
            <div className="line-clamp-3">
              {ocrResult.pages?.[0]?.text?.slice(0, 160) || 'No text preview available.'}
            </div>
            {ocrResult.visionAnalysis?.detectedFields?.length ? (
              <div className="space-y-1">
                <div className="font-medium text-foreground">Detected Fields</div>
                {ocrResult.visionAnalysis.detectedFields.slice(0, 3).map((field) => (
                  <div key={field.field} className="flex items-center justify-between">
                    <span>{field.field}</span>
                    <span>{field.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {onViewFull && (
          <Button size="sm" variant="outline" className="w-full" onClick={onViewFull}>
            <Eye className="mr-2 h-4 w-4" />
            View Full OCR
          </Button>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
