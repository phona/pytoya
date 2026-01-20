import { useMemo, useState } from 'react';
import { AlertTriangle, DollarSign, FileText, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';

interface ExtractConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: ExtractOptions) => void;
  manifestCount: number;
  pageCount: number;
  costEstimate: {
    min: number;
    max: number;
    currency: string;
    ocrCost: number;
    llmCostMin: number;
    llmCostMax: number;
  };
  llmModels?: Array<{ id: string; name: string; pricing?: { llm?: { inputPrice: number; outputPrice: number; currency: string } } }>;
  prompts?: Array<{ id: number; name: string }>;
  defaultLlmModelId?: string;
  budget?: number;
  isExtracting?: boolean;
}

export interface ExtractOptions {
  llmModelId?: string;
  promptId?: number;
}

export function ExtractConfirmationModal({
  open,
  onClose,
  onConfirm,
  manifestCount,
  pageCount,
  costEstimate,
  llmModels = [],
  prompts = [],
  defaultLlmModelId,
  budget = 50,
  isExtracting = false,
}: ExtractConfirmationModalProps) {
  const [selectedModelId, setSelectedModelId] = useState(defaultLlmModelId || '');
  const [selectedPromptId, setSelectedPromptId] = useState<number | undefined>();
  const [agreedToCost, setAgreedToCost] = useState(false);
  const defaultPromptValue = '__default__';

  const remainingBudget = budget - costEstimate.max;
  const isOverBudget = remainingBudget < 0;
  const isNearBudget = remainingBudget >= 0 && remainingBudget < budget * 0.2;

  const selectedModel = llmModels.find((m) => m.id === selectedModelId);
  const modelPricing = selectedModel?.pricing?.llm;

  const handleConfirm = () => {
    if (!agreedToCost) return;

    onConfirm({
      llmModelId: selectedModelId || undefined,
      promptId: selectedPromptId,
    });
  };

  const formatModelPricing = (model: typeof llmModels[0]) => {
    if (!model.pricing?.llm) return 'Pricing not set';
    const { inputPrice, outputPrice, currency } = model.pricing.llm;
    return `$${inputPrice.toFixed(2)} in / $${outputPrice.toFixed(2)} out per 1M ${currency}`;
  };

  const sortedModels = useMemo(() => {
    return [...llmModels].sort((a, b) => {
      const aPrice = a.pricing?.llm?.inputPrice ?? 0;
      const bPrice = b.pricing?.llm?.inputPrice ?? 0;
      return aPrice - bPrice;
    });
  }, [llmModels]);

  const estimatedTokensMin = Math.round((costEstimate.llmCostMin / (modelPricing?.inputPrice || 1)) * 1_000_000);
  const estimatedTokensMax = Math.round((costEstimate.llmCostMax / (modelPricing?.inputPrice || 1)) * 1_000_000);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isExtracting && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {manifestCount === 1 ? 'Extract Document' : `Extract ${manifestCount} Documents`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Documents to extract */}
          <div>
            <h4 className="text-sm font-medium mb-3">Documents to Extract</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto rounded-md border border-border bg-muted p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {manifestCount} document{manifestCount !== 1 ? 's' : ''}
                </span>
                <span className="font-medium">{pageCount} pages</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total pages</span>
                <span className="font-medium">{pageCount}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Extraction Settings */}
          <div>
            <h4 className="text-sm font-medium mb-3">Extraction Settings</h4>
            <div className="space-y-3">
              {/* Model Selection */}
              <div>
                <Label htmlFor="model-select">Model</Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger id="model-select" className="mt-1">
                    <SelectValue placeholder="Select extraction model" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatModelPricing(model)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt Selection */}
              {prompts.length > 0 && (
                <div>
                  <Label htmlFor="prompt-select">Prompt Template (Optional)</Label>
                  <Select
                    value={selectedPromptId ? selectedPromptId.toString() : defaultPromptValue}
                    onValueChange={(value) =>
                      setSelectedPromptId(value === defaultPromptValue ? undefined : Number(value))
                    }
                  >
                    <SelectTrigger id="prompt-select" className="mt-1">
                      <SelectValue placeholder="Use default prompt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={defaultPromptValue}>Use default prompt</SelectItem>
                      {prompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id.toString()}>
                          {prompt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Cost Estimate */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Estimate
            </h4>

            <div className="rounded-md border border-border bg-card p-4 space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="text-sm font-medium">{manifestCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated tokens</span>
                <span className="text-sm font-medium">
                  {estimatedTokensMin.toLocaleString()} - {estimatedTokensMax.toLocaleString()}
                </span>
              </div>

              {/* Cost Breakdown */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">OCR Cost</span>
                  <span className="font-medium">${costEstimate.ocrCost.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">LLM Cost (min-max)</span>
                  <span className="font-medium">
                    ${costEstimate.llmCostMin.toFixed(4)} - ${costEstimate.llmCostMax.toFixed(4)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Estimated</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-semibold">
                      ${costEstimate.min.toFixed(4)} - ${costEstimate.max.toFixed(4)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {costEstimate.currency}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Budget Warning */}
              {(isOverBudget || isNearBudget) && (
                <div
                  className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                    isOverBudget
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                  }`}
                >
                  {isOverBudget ? (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>
                    {isOverBudget
                      ? `Warning: This will exceed your budget by $${Math.abs(remainingBudget).toFixed(2)}.`
                      : `Note: This will use ${((costEstimate.max / budget) * 100).toFixed(0)}% of your budget. Remaining budget: $${remainingBudget.toFixed(2)}.`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Confirmation Checkbox */}
          <div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agree-cost"
                checked={agreedToCost}
                onChange={(e) => setAgreedToCost(e.target.checked)}
                className="h-4 w-4 mt-1"
              />
              <label htmlFor="agree-cost" className="text-sm text-muted-foreground cursor-pointer">
                I understand that costs will be incurred once extraction starts, regardless of the results.
                The actual cost may vary from the estimate.
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExtracting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!agreedToCost || !selectedModelId || isExtracting}
            >
              {isExtracting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  Start Extraction
                </>
              )}
            </Button>
          </div>

          {/* Info Message */}
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Cost Breakdown</p>
              <p className="text-xs">
                OCR costs are calculated per page processed. LLM costs are based on the number of tokens used (input and output).
                The final cost may vary depending on the actual document complexity and model response length.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
