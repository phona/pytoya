import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Copy, Eye, EyeOff, RefreshCw, X } from 'lucide-react';
import { useReExtractFieldPreview } from '@/shared/hooks/use-manifests';
import { useModels } from '@/shared/hooks/use-models';
import { usePrompts } from '@/shared/hooks/use-prompts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface FieldReExtractDialogProps {
  open: boolean;
  onClose: () => void;
  manifestId: number;
  fieldName: string;
  fieldHint?: string;
  defaultModelId?: string;
  currentValue?: unknown;
  ocrContext?: string;
  onSubmit?: (jobId: string) => void;
}

export function FieldReExtractDialog({
  open,
  onClose,
  manifestId,
  fieldName,
  fieldHint,
  defaultModelId,
  currentValue,
  ocrContext,
  onSubmit,
}: FieldReExtractDialogProps) {
  const reExtractFieldWithPreview = useReExtractFieldPreview();
  const { models } = useModels();
  const { prompts } = usePrompts();

  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<number | undefined>();
  const [customPrompt, setCustomPrompt] = useState('');
  const [includeOcrContext, setIncludeOcrContext] = useState(true);
  const [previewOnly, setPreviewOnly] = useState(true);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [showOcrContext, setShowOcrContext] = useState(true);
  const defaultPromptValue = '__default__';

  const llmModels = useMemo(
    () => models?.filter((m) => m.adapterType !== 'paddlex' && m.isActive) ?? [],
    [models],
  );

  const resolvedDefaultModelId = useMemo(() => {
    if (defaultModelId && llmModels.some((m) => m.id === defaultModelId)) {
      return defaultModelId;
    }
    return llmModels[0]?.id ?? '';
  }, [defaultModelId, llmModels]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedModelId(resolvedDefaultModelId);
    setSelectedPromptId(undefined);
    setCustomPrompt(fieldHint?.trim() ?? '');
    setIncludeOcrContext(true);
    setPreviewOnly(true);
    setEstimatedCost(null);
    setOcrPreview(null);
    setShowOcrContext(true);
  }, [fieldHint, open, resolvedDefaultModelId, fieldName]);

  const handlePreview = async () => {
    try {
      const result = await reExtractFieldWithPreview.mutateAsync({
        manifestId,
        data: {
          fieldName,
          llmModelId: selectedModelId || undefined,
          promptId: selectedPromptId,
          customPrompt: customPrompt || undefined,
          includeOcrContext: includeOcrContext ? undefined : false,
          previewOnly: true,
        },
      });

      setOcrPreview(result.ocrPreview?.snippet ?? null);
      setEstimatedCost(result.estimatedCost);
      setCurrency(result.currency);
      setPreviewOnly(false);
    } catch (error) {
      console.error('Failed to preview field re-extraction:', error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await reExtractFieldWithPreview.mutateAsync({
        manifestId,
        data: {
          fieldName,
          llmModelId: selectedModelId || undefined,
          promptId: selectedPromptId,
          customPrompt: customPrompt || undefined,
          includeOcrContext: includeOcrContext ? undefined : false,
          previewOnly: false,
        },
      });

      if (result.jobId && onSubmit) {
        onSubmit(result.jobId);
      }
      onClose();
    } catch (error) {
      console.error('Failed to re-extract field:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOcrContext = async () => {
    if (ocrPreview) {
      await navigator.clipboard.writeText(ocrPreview);
    }
  };

  const displayValue = currentValue !== undefined
    ? JSON.stringify(currentValue, null, 2)
    : 'Not set';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Re-extract Field: {fieldName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview and re-extract a single field using the selected model and prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Value */}
          <div>
            <Label className="text-sm font-medium">Current Value</Label>
            <div className="mt-2 rounded-md border border-border bg-muted px-3 py-2">
              <pre className="text-xs text-foreground overflow-x-auto">
                {displayValue}
              </pre>
            </div>
          </div>

          <Separator />

          {/* OCR Context Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                What the OCR/LLM Sees
              </Label>
              <div className="flex items-center gap-2">
                {ocrPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyOcrContext}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOcrContext(!showOcrContext)}
                  className="text-xs"
                >
                  {showOcrContext ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {showOcrContext && (
              <div className="rounded-md border border-border bg-muted px-3 py-2">
                {ocrPreview ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {ocrPreview}
                  </pre>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Click &quot;Preview&quot; to see what OCR context will be sent to the LLM.
                    </p>
                    {ocrContext && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-foreground font-medium">
                          Show cached OCR context ({ocrContext.slice(0, 50)}...)
                        </summary>
                        <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                          {ocrContext}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="include-ocr-context"
                checked={includeOcrContext}
                onChange={(e) => setIncludeOcrContext(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="include-ocr-context" className="text-xs text-muted-foreground">
                Include OCR context in extraction
              </Label>
            </div>
          </div>

          <Separator />

          {/* Extraction Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Extraction Settings</h3>

            {/* Model Selection */}
            <div>
              <Label htmlFor="model-select">LLM Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger id="model-select" className="mt-1">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {llmModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                      {model.pricing?.llm && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (${model.pricing.llm.inputPrice}/1M in, ${model.pricing.llm.outputPrice}/1M out)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Selection */}
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
                  {prompts?.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id.toString()}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Prompt */}
            <div>
              <Label htmlFor="custom-prompt">Custom Instructions (Optional)</Label>
              {fieldHint && (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    hint: {fieldHint}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomPrompt(fieldHint)}
                    disabled={isSubmitting}
                  >
                    Reset to hint
                  </Button>
                </div>
              )}
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add specific instructions for extracting this field..."
                className="mt-1 min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Adding specific instructions can improve accuracy for this field.
              </p>
            </div>
          </div>

          {/* Cost Estimate */}
          {estimatedCost !== null && (
            <>
              <Separator />
              <div className="rounded-md border border-border bg-muted px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background">
                      💰 Cost Estimate
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Estimated cost for this extraction:
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-semibold">
                      ${estimatedCost.toFixed(4)}
                    </span>
                    <span className="text-xs text-muted-foreground">{currency}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {previewOnly ? (
              <Button
                onClick={handlePreview}
                disabled={reExtractFieldWithPreview.isPending || !selectedModelId}
              >
                {reExtractFieldWithPreview.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedModelId}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-extract Field
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info Message */}
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Field-level re-extraction uses the OCR context from the document to extract only the specified field. This is more cost-effective than re-extracting the entire document.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
