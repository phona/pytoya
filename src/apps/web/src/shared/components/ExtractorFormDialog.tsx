import { CreateExtractorDto, UpdateExtractorDto, Extractor, ExtractorPreset, ExtractorType } from '@/api/extractors';
import { ExtractorForm } from '@/shared/components/ExtractorForm';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type ExtractorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractor?: Extractor | null;
  types: ExtractorType[];
  presets?: ExtractorPreset[];
  onSubmit: (data: CreateExtractorDto | UpdateExtractorDto) => Promise<void>;
  onTest?: (id: string) => Promise<void>;
  isSaving?: boolean;
  isTesting?: boolean;
};

export function ExtractorFormDialog({
  open,
  onOpenChange,
  extractor,
  types,
  presets,
  onSubmit,
  onTest,
  isSaving,
  isTesting,
}: ExtractorFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{extractor ? 'Edit Extractor' : 'New Text Extractor'}</DialogTitle>
          <DialogDescription>
            {extractor
              ? 'Update extractor settings and pricing.'
              : 'Create a reusable text extractor configuration.'}
          </DialogDescription>
        </DialogHeader>
        {extractor && onTest && (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onTest(extractor.id)}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        )}
        <ExtractorForm
          types={types}
          presets={presets}
          extractor={extractor ?? undefined}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
