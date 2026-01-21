import { AlertTriangle, FileText, XCircle } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { Progress } from '@/shared/components/ui/progress';

interface OcrViewerProps {
  manifest: Manifest;
}

export function OcrViewer({ manifest }: OcrViewerProps) {
  const extractedData = (manifest.extractedData ?? {}) as ExtractedData;
  const extractionInfo = extractedData._extraction_info ?? {};

  return (
    <div>
      {/* Overall Confidence */}
      {extractionInfo.confidence !== undefined && (
        <div className="mb-6 p-4 bg-background rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">Overall Confidence</span>
            <span className="text-lg font-bold text-foreground">
              {Math.round(extractionInfo.confidence * 100)}%
            </span>
          </div>
          <Progress
            value={Math.round(extractionInfo.confidence * 100)}
            className="h-2 bg-muted"
            indicatorClassName="bg-primary"
          />
        </div>
      )}

      {/* Field Confidences */}
      {extractionInfo.field_confidences && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3">Field-by-Field Confidence</h4>
          <div className="space-y-2">
          {Object.entries(extractionInfo.field_confidences ?? {}).map(([field, confidence]) => (
              <div key={field} className="flex items-center justify-between p-2 bg-card border rounded">
                <span className="text-sm text-muted-foreground font-mono">{field}</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.round(confidence * 100)}
                    className="h-2 w-24 bg-muted"
                    indicatorClassName={
                      confidence >= 0.9
                        ? 'bg-[color:var(--status-completed-text)]'
                        : confidence >= 0.7
                          ? 'bg-[color:var(--status-pending-text)]'
                          : 'bg-[color:var(--status-failed-text)]'
                    }
                  />
                  <span className="text-sm text-foreground w-12 text-right">
                    {Math.round(confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Issues */}
      {extractionInfo.ocr_issues && extractionInfo.ocr_issues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3">Text Issues Detected</h4>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <ul className="space-y-2">
              {extractionInfo.ocr_issues.map((issue: string, i: number) => (
                <li key={i} className="text-sm text-destructive flex items-start">
                  <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Uncertain Fields */}
      {extractionInfo.uncertain_fields && extractionInfo.uncertain_fields.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3">Uncertain Fields</h4>
          <div className="bg-[color:var(--status-warning-bg)] border border-border rounded-lg p-4">
            <ul className="space-y-2">
              {extractionInfo.uncertain_fields.map((field: string, i: number) => (
                <li key={i} className="text-sm text-[color:var(--status-warning-text)] flex items-start">
                  <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[color:var(--status-warning-text)]" />
                  <span className="font-mono">{field}</span> - Please verify this value
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Raw Text */}
      {extractionInfo.raw_ocr_text && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Raw Text</h4>
          <div className="bg-background border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
              {extractionInfo.raw_ocr_text}
            </pre>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!extractionInfo.confidence &&
        !extractionInfo.field_confidences &&
        !extractionInfo.ocr_issues &&
        !extractionInfo.uncertain_fields &&
        !extractionInfo.raw_ocr_text && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>No extraction diagnostics available.</p>
          </div>
        )}
    </div>
  );
}

interface ExtractedData {
  _extraction_info?: {
    confidence?: number;
    field_confidences?: Record<string, number>;
    ocr_issues?: string[];
    uncertain_fields?: string[];
    raw_ocr_text?: string;
  };
}




