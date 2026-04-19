import type { ValidationResult } from '@/api/validation';
import { ValidationResultsPanel } from '@/shared/components/ValidationResultsPanel';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useI18n } from '@/shared/providers/I18nProvider';

interface ValidationResultsDialogProps {
  open: boolean;
  onClose: () => void;
  result: ValidationResult | null;
}

// Pops validation issues in a modal directly, so the user doesn't have to
// dismiss a toast then switch tabs to see what failed. Reuses the same
// ValidationResultsPanel that the tab renders — identical layout/colouring,
// just surfaced on top of the Form tab.
export function ValidationResultsDialog({
  open,
  onClose,
  result,
}: ValidationResultsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('audit.validation.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('audit.validation.dialogSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <ValidationResultsPanel result={result} />
        </div>

        <div className="mt-4 flex items-center justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
