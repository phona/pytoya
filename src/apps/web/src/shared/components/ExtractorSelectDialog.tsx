import { useMemo, useState } from 'react';
import { Extractor } from '@/api/extractors';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { formatCurrencyCode } from '@/shared/utils/cost';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';

type ExtractorSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractors: Extractor[];
  selectedId?: string;
  onConfirm: (extractorId: string) => void;
};

const getPricingSummary = (extractor: Extractor) => {
  const pricing = (extractor.config?.pricing as { mode?: string; currency?: string; pricePerPage?: number; fixedCost?: number; inputPricePerMillionTokens?: number; outputPricePerMillionTokens?: number } | undefined);
  if (!pricing) return 'Pricing not set';
  const currency = formatCurrencyCode(pricing.currency);
  if (pricing.mode === 'token') {
    return `Token: ${pricing.inputPricePerMillionTokens ?? 0}/${pricing.outputPricePerMillionTokens ?? 0} per 1M ${currency}`;
  }
  if (pricing.mode === 'page') {
    return `Per page: ${pricing.pricePerPage ?? 0} ${currency}`;
  }
  if (pricing.mode === 'fixed') {
    return `Fixed: ${pricing.fixedCost ?? 0} ${currency}`;
  }
  return 'No cost (free)';
};

export function ExtractorSelectDialog({
  open,
  onOpenChange,
  extractors,
  selectedId,
  onConfirm,
}: ExtractorSelectDialogProps) {
  const [currentId, setCurrentId] = useState(selectedId ?? '');

  const sortedExtractors = useMemo(() => {
    return [...extractors].sort((a, b) => a.name.localeCompare(b.name));
  }, [extractors]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setCurrentId(selectedId ?? '');
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Extractor</DialogTitle>
          <DialogDescription>Choose the text extractor for this project.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={currentId} onValueChange={setCurrentId} className="space-y-3">
          {sortedExtractors.map((extractor) => (
            <div
              key={extractor.id}
              className={`flex items-start gap-3 rounded-md border border-border p-3 transition ${
                currentId === extractor.id ? 'bg-primary/5 border-primary/30' : 'bg-card'
              }`}
            >
              <RadioGroupItem value={extractor.id} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{extractor.name}</span>
                  <Badge variant="outline">{extractor.extractorType}</Badge>
                  {!extractor.isActive && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {extractor.description ?? 'No description'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {getPricingSummary(extractor)}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (currentId) {
                onConfirm(currentId);
                onOpenChange(false);
              }
            }}
            disabled={!currentId}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
