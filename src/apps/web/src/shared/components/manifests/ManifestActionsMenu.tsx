import { useCallback, useMemo, useState } from 'react';
import { Eye, MoreVertical, Play, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import type { Manifest } from '@/api/manifests';
import { getApiErrorText } from '@/api/client';
import { toast } from '@/shared/hooks/use-toast';
import { useDeleteManifest, useTriggerExtraction } from '@/shared/hooks/use-manifests';
import { useRunValidation } from '@/shared/hooks/use-validation-scripts';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useI18n } from '@/shared/providers/I18nProvider';
import type { ValidationResult } from '@/api/validation';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';

type ManifestActionsMenuProps = {
  manifest: Manifest;
  onPreviewOcr?: (manifestId: number) => void;
};

const formatValidationSummary = (
  result: ValidationResult,
  t: (key: string, vars?: Record<string, unknown>) => string,
) => {
  if (result.errorCount > 0) {
    const warningSuffix =
      result.warningCount > 0 ? ` • ${t('audit.validation.warnings', { count: result.warningCount })}` : '';
    return `${t('audit.validation.errors', { count: result.errorCount })}${warningSuffix}`;
  }
  if (result.warningCount > 0) {
    return t('audit.validation.warnings', { count: result.warningCount });
  }
  return t('audit.validation.passed');
};

export function ManifestActionsMenu({ manifest, onPreviewOcr }: ManifestActionsMenuProps) {
  const { t } = useI18n();
  const triggerExtraction = useTriggerExtraction();
  const runValidation = useRunValidation();
  const deleteManifest = useDeleteManifest();
  const { confirm, alert, ModalDialog } = useModalDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  const canExtract = manifest.status === 'pending' || manifest.status === 'failed';
  const canReExtract = manifest.status === 'completed';
  const canValidate = manifest.status === 'completed';

  const handleExtract = useCallback(async () => {
    try {
      await triggerExtraction.mutateAsync({ manifestId: manifest.id });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('manifests.table.extract'),
        description: getApiErrorText(error, t),
      });
    }
  }, [manifest.id, t, triggerExtraction]);

  const handleReExtract = useCallback(async () => {
    try {
      await triggerExtraction.mutateAsync({ manifestId: manifest.id });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('manifests.table.reextract'),
        description: getApiErrorText(error, t),
      });
    }
  }, [manifest.id, t, triggerExtraction]);

  const handleRunValidation = useCallback(async () => {
    try {
      const result = await runValidation.mutateAsync({ manifestId: manifest.id });
      toast({
        title: t('audit.menu.runValidation'),
        description: formatValidationSummary(result, t),
        variant: result.errorCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('audit.menu.runValidation'),
        description: getApiErrorText(error, t),
      });
    }
  }, [manifest.id, runValidation, t]);

  const showPreview = Boolean(onPreviewOcr);
  const showExtract = canExtract;
  const showReExtract = canReExtract;
  const showValidation = true;
  const showDelete = true;

  const hasAnyActions = useMemo(
    () => showPreview || showExtract || showReExtract || showValidation || showDelete,
    [showDelete, showExtract, showPreview, showReExtract, showValidation],
  );

  if (!hasAnyActions) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            title={t('manifests.actions.menuTitle')}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          id={`manifest-actions-menu-${manifest.id}`}
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          {showPreview ? (
            <DropdownMenuItem
              onSelect={() => {
                onPreviewOcr?.(manifest.id);
              }}
            >
              <Eye className="h-4 w-4" />
              {t('manifests.table.previewText')}
            </DropdownMenuItem>
          ) : null}

          {showPreview ? <DropdownMenuSeparator /> : null}

          <DropdownMenuItem disabled={!canValidate || runValidation.isPending} onSelect={handleRunValidation}>
            <ShieldCheck className="h-4 w-4" />
            {t('audit.menu.runValidation')}
          </DropdownMenuItem>

          {showExtract || showReExtract ? <DropdownMenuSeparator /> : null}

          {showExtract ? (
            <DropdownMenuItem disabled={triggerExtraction.isPending} onSelect={handleExtract}>
              <Play className="h-4 w-4" />
              {t('manifests.table.extract')}
            </DropdownMenuItem>
          ) : null}

          {showReExtract ? (
            <DropdownMenuItem disabled={triggerExtraction.isPending} onSelect={handleReExtract}>
              <RefreshCw className="h-4 w-4" />
              {t('manifests.table.reextract')}
            </DropdownMenuItem>
          ) : null}

          {showDelete ? <DropdownMenuSeparator /> : null}

          {showDelete ? (
            <DropdownMenuItem
              disabled={isDeleting || deleteManifest.isPending}
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                void (async () => {
                  const confirmed = await confirm({
                    title: t('manifests.deleteTitle'),
                    message: t('manifests.deleteMessage', { name: manifest.originalFilename ?? manifest.filename }),
                    confirmText: t('common.delete'),
                    cancelText: t('common.cancel'),
                    destructive: true,
                  });
                  if (!confirmed) return;
                  setIsDeleting(true);
                  try {
                    await deleteManifest.mutateAsync(manifest.id);
                    toast({
                      title: t('manifests.deleteSuccessTitle'),
                    });
                  } catch (error) {
                    void alert({
                      title: t('common.deleteFailedTitle'),
                      message: getApiErrorText(error, t),
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                })();
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ModalDialog />
    </>
  );
}
