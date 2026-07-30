import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { JsonSchemaForm } from '@/shared/components/JsonSchemaForm';
import type { OcrPipelineEntry, ExtractorTypeInfo } from '@/shared/hooks/use-ocr-pipeline';
import type { Extractor } from '@/api/extractors';
import { useI18n } from '@/shared/providers/I18nProvider';

interface AddExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractorInstances: Extractor[];
  extractorTypeMap: Map<string, ExtractorTypeInfo>;
  onConfirm: (entry: OcrPipelineEntry) => void;
  initialEntry?: OcrPipelineEntry | null;
}

export function AddExtractorDialog({
  open,
  onOpenChange,
  extractorInstances,
  extractorTypeMap,
  onConfirm,
  initialEntry,
}: AddExtractorDialogProps) {
  const { t } = useI18n();
  const isEdit = !!initialEntry;
  const [step, setStep] = useState<'select' | 'config'>(initialEntry ? 'config' : 'select');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(initialEntry?.extractorId ?? '');
  const [config, setConfig] = useState<Record<string, unknown>>(initialEntry?.config ?? {});

  const selectedInstance = extractorInstances.find((inst) => inst.id === selectedInstanceId);
  const typeInfo = selectedInstance ? extractorTypeMap.get(selectedInstance.extractorType) : null;

  const handleNext = () => {
    if (!selectedInstanceId) return;
    setStep('config');
  };

  const handleConfirm = () => {
    if (!selectedInstanceId) return;
    onConfirm({ extractorId: selectedInstanceId, config });
    onOpenChange(false);
    setTimeout(() => {
      setStep('select');
      setSelectedInstanceId('');
      setConfig({});
    }, 200);
  };

  const handleBack = () => {
    setStep('select');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit OCR Engine' : 'Add OCR Engine'}
            {step === 'config' && selectedInstance && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                — Step 2 of 2
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {extractorInstances.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active extractors available. Create one in the admin Extractors page first.
              </p>
            ) : (
              extractorInstances.map((inst) => (
                <label
                  key={inst.id}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors
                    ${selectedInstanceId === inst.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                    }`}
                >
                  <input
                    type="radio"
                    name="extractor-instance"
                    value={inst.id}
                    checked={selectedInstanceId === inst.id}
                    onChange={(e) => setSelectedInstanceId(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{inst.name}</span>
                      <span className="text-xs rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {inst.extractorType}
                      </span>
                    </div>
                    {inst.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {inst.description}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedInstance && (
              <div className="rounded-md bg-muted/30 p-3 text-sm">
                <span className="font-medium">{selectedInstance.name}</span>
                <span className="text-muted-foreground ml-2">({selectedInstance.extractorType})</span>
              </div>
            )}
            {typeInfo ? (
              <JsonSchemaForm
                schema={typeInfo.configSchema}
                value={config}
                onChange={setConfig}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No configurable parameters for this extractor type.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'select' && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel') ?? 'Cancel'}
              </Button>
              <Button type="button" onClick={handleNext} disabled={!selectedInstanceId}>
                Next →
              </Button>
            </>
          )}
          {step === 'config' && (
            <>
              <Button type="button" variant="outline" onClick={handleBack}>
                ← Back
              </Button>
              <Button type="button" onClick={handleConfirm}>
                {isEdit ? 'Save' : 'Add'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
