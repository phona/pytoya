import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { usePageImage } from '@/shared/hooks/use-correction';
import { useI18n } from '@/shared/providers/I18nProvider';

interface BboxEditorProps {
  manifestId: number;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BboxEditor({ manifestId, page, bbox, open, onOpenChange }: BboxEditorProps) {
  const { t } = useI18n();
  const { objectUrl, isLoading, error } = usePageImage(manifestId, page);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {t('correction.bbox')} — {t('audit.ocrPreview.layout.page', { page })}
          </DialogTitle>
        </DialogHeader>
        <div className="relative inline-block min-h-[300px] w-full">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-64 text-sm text-destructive">
              {error}
            </div>
          )}
          {objectUrl && (
            <div className="relative">
              <img
                src={objectUrl}
                alt={`Page ${page}`}
                className="w-full h-auto rounded border"
              />
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                style={{
                  left: `${bbox.x * 100}%`,
                  top: `${bbox.y * 100}%`,
                  width: `${bbox.width * 100}%`,
                  height: `${bbox.height * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
