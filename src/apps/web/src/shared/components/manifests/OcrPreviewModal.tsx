import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useOcrResult } from '@/shared/hooks/use-manifests';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { PdfViewer } from './PdfViewer';
import { useI18n } from '@/shared/providers/I18nProvider';

interface OcrPreviewModalProps {
  manifestId: number;
  open: boolean;
  onClose: () => void;
  onExtract?: () => void;
}

const getQualityBadge = (
  score: number | null | undefined,
  labels: { notProcessed: string; excellent: string; good: string; poor: string },
) => {
  if (score === null || score === undefined) {
    return { label: labels.notProcessed, className: 'bg-muted text-muted-foreground' };
  }
  if (score >= 90) return { label: labels.excellent, className: 'bg-emerald-100 text-emerald-800' };
  if (score >= 70) return { label: labels.good, className: 'bg-yellow-100 text-yellow-800' };
  return { label: labels.poor, className: 'bg-red-100 text-red-800' };
};

export function OcrPreviewModal({ manifestId, open, onClose, onExtract }: OcrPreviewModalProps) {
  const { t } = useI18n();
  const { data, isLoading, error } = useOcrResult(manifestId, open);

  const [searchTerm, setSearchTerm] = useState('');
  const [highlightConfidence, setHighlightConfidence] = useState(false);

  const ocrResult = data?.ocrResult ?? null;
  const qualityScore = data?.qualityScore ?? null;
  const qualityBadge = getQualityBadge(qualityScore, {
    notProcessed: t('audit.ocrPreview.quality.notProcessed'),
    excellent: t('audit.ocrPreview.quality.excellent'),
    good: t('audit.ocrPreview.quality.good'),
    poor: t('audit.ocrPreview.quality.poor'),
  });

  const rawText = useMemo(() => {
    if (!ocrResult?.pages) return '';
    return ocrResult.pages.map((page) => page.text).join('\n');
  }, [ocrResult]);

  const filteredLines = useMemo(() => {
    const lines = rawText.split(/\r?\n/);
    if (!searchTerm.trim()) return lines;
    const lower = searchTerm.toLowerCase();
    return lines.filter((line) => line.toLowerCase().includes(lower));
  }, [rawText, searchTerm]);

  const handleCopy = async () => {
    if (!rawText) return;
    await navigator.clipboard.writeText(rawText);
  };

  const handleDownload = () => {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ocr-manifest-${manifestId}.txt`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{t('audit.ocrPreview.title')}</span>
            <div className="flex items-center gap-2">
              <Badge className={qualityBadge.className}>{qualityBadge.label}</Badge>
              {onExtract && (
                <Button size="sm" onClick={onExtract}>
                  {t('manifests.table.extract')}
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('audit.ocrPreview.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pdf" className="mt-2">
          <TabsList>
            <TabsTrigger value="pdf">{t('audit.ocrPreview.tabs.pdf')}</TabsTrigger>
            <TabsTrigger value="text">{t('audit.ocrPreview.tabs.text')}</TabsTrigger>
            <TabsTrigger value="layout">{t('audit.ocrPreview.tabs.layout')}</TabsTrigger>
            <TabsTrigger value="vision">{t('audit.ocrPreview.tabs.vision')}</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="mt-4">
            <div className="h-[60vh] rounded-md border border-border overflow-hidden">
              <PdfViewer manifestId={manifestId} />
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('audit.ocrPreview.searchPlaceholder')}
                className="max-w-xs"
              />
              <Button size="sm" variant="outline" onClick={handleCopy} disabled={!rawText}>
                {t('audit.ocrPreview.copy')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={!rawText}>
                <Download className="mr-2 h-4 w-4" />
                {t('audit.ocrPreview.download')}
              </Button>
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={highlightConfidence}
                  onChange={(event) => setHighlightConfidence(event.target.checked)}
                />
                {t('audit.ocrPreview.highlightLowConfidence')}
              </label>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">{t('audit.ocrPreview.loadingText')}</p>}
            {error && <p className="text-sm text-destructive">{t('audit.ocrPreview.failedToLoadText')}</p>}
            {!ocrResult && !isLoading && (
              <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('audit.ocrPreview.notProcessed')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('manifests.extractModal.notice')}
                </div>
              </div>
            )}
            {ocrResult && (
              <div className="max-h-[52vh] overflow-auto rounded-md border border-border bg-muted px-4 py-3 text-xs leading-relaxed">
                {filteredLines.map((line, index) => (
                  <div
                    key={`${line}-${index}`}
                    className={`flex gap-3 ${highlightConfidence && line.length < 10 ? 'bg-red-50' : ''}`}
                  >
                    <span className="w-8 text-muted-foreground text-right">{index + 1}</span>
                    <span className="flex-1 whitespace-pre-wrap">{line}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="layout" className="mt-4">
            {ocrResult ? (
              <div className="grid gap-4 md:grid-cols-2">
                {ocrResult.pages.map((page) => (
                  <div key={page.pageNumber} className="rounded-md border border-border p-3">
                    <div className="text-sm font-medium text-foreground mb-2">
                      {t('audit.ocrPreview.layout.page', { page: page.pageNumber })}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t('audit.ocrPreview.layout.stats', {
                        elements: page.layout?.elements?.length ?? 0,
                        tables: page.layout?.tables?.length ?? 0,
                      })}
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(page.layout, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('audit.ocrPreview.layout.empty')}</p>
            )}
          </TabsContent>

          <TabsContent value="vision" className="mt-4">
            {ocrResult?.visionAnalysis ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{t('audit.ocrPreview.vision.caption')}</div>
                  <p className="text-sm text-muted-foreground">{ocrResult.visionAnalysis.caption}</p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t('audit.ocrPreview.vision.detectedFields')}</div>
                  <div className="mt-2 space-y-2">
                    {ocrResult.visionAnalysis.detectedFields.map((field) => (
                      <div key={field.field} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <span>{field.field}</span>
                        <span className="text-muted-foreground">{field.value}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(field.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {ocrResult.visionAnalysis.qualityWarnings?.length ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">{t('audit.ocrPreview.vision.warnings')}</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                      {ocrResult.visionAnalysis.qualityWarnings.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('audit.ocrPreview.vision.empty')}</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
