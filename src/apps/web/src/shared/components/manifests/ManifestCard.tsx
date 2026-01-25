import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';
import { useI18n } from '@/shared/providers/I18nProvider';
import { formatCostWithCurrency } from '@/shared/utils/cost';

interface ManifestCardProps {
  manifest: Manifest;
  extractorInfo?: { name: string; type?: string };
  onClick: () => void;
}

export function ManifestCard({ manifest, extractorInfo, onClick }: ManifestCardProps) {
  const { t } = useI18n();
  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'border-border';
    if (confidence >= 0.9) return 'border-[color:var(--status-completed-text)]';
    if (confidence >= 0.7) return 'border-[color:var(--status-pending-text)]';
    return 'border-[color:var(--status-failed-text)]';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`bg-card rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer border-l-4 ${getConfidenceColor(manifest.confidence)}`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-sm font-medium text-foreground truncate flex-1" title={manifest.originalFilename}>
            {manifest.originalFilename}
          </h3>
          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(manifest.status)}`}>
            {manifest.status === 'pending'
              ? t('manifests.status.pending')
              : manifest.status === 'processing'
                ? t('manifests.status.processing')
                : manifest.status === 'completed'
                  ? t('manifests.status.completed')
                  : manifest.status === 'failed'
                    ? t('manifests.status.failed')
                    : manifest.status}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          {manifest.textExtractorId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('manifests.card.extractor')}:</span>
              <span className="text-foreground">
                {extractorInfo?.name ?? manifest.textExtractorId}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('manifests.card.confidence')}:</span>
            <span className="text-foreground">
              {manifest.confidence !== null
                ? `${Math.round(manifest.confidence * 100)}%`
                : t('common.na')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('manifests.card.size')}:</span>
            <span className="text-foreground">{formatFileSize(manifest.fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('manifests.card.cost')}:</span>
            <span className="text-foreground">
              {manifest.extractionCost !== null && manifest.extractionCost !== undefined
                ? formatCostWithCurrency(Number(manifest.extractionCost), manifest.extractionCostCurrency)
                : t('common.na')}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
          <div className="flex items-center">
            {manifest.humanVerified ? (
              <div className="flex items-center text-[color:var(--status-verified-text)]">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                <span className="text-xs">{t('manifests.card.verified')}</span>
              </div>
            ) : (
              <div className="flex items-center text-[color:var(--status-pending-text)]">
                <Clock className="mr-1 h-4 w-4" />
                <span className="text-xs">{t('manifests.card.pending')}</span>
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
            {t('common.view')}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}




