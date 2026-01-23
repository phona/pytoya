import { Fragment, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Clock, DollarSign, Save } from 'lucide-react';
import { Model } from '@/api/models';
import { modelsApi } from '@/api/models';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatCurrencyCode } from '@/shared/utils/cost';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

interface ModelPricingConfigProps {
  models: Model[];
  onUpdate?: () => void;
}

interface PricingFormState {
  llmInputPrice: string;
  llmOutputPrice: string;
  currency: string;
  minimumCharge: string;
}

const initialFormState: PricingFormState = {
  llmInputPrice: '',
  llmOutputPrice: '',
  currency: '',
  minimumCharge: '',
};

type PricingHistoryEntry = Model['pricingHistory'][number];

const formatTokenPrice = (price: number) => {
  const safePrice = Number.isFinite(price) ? price : 0;
  const precision = safePrice > 0 && safePrice < 0.01 ? 4 : 2;
  return safePrice.toFixed(precision);
};

export function ModelPricingConfig({ models, onUpdate }: ModelPricingConfigProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<PricingFormState>(initialFormState);
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      llmInputPrice: model.pricing?.llm?.inputPrice?.toString() || '0',
      llmOutputPrice: model.pricing?.llm?.outputPrice?.toString() || '0',
      currency: model.pricing?.llm?.currency ?? '',
      minimumCharge: model.pricing?.llm?.minimumCharge?.toString() || '',
    });
  };

  const handleCancel = () => {
    setEditingModel(null);
    setFormData(initialFormState);
  };

  const handleSave = async () => {
    if (!editingModel) return;

    setIsSaving(true);
    try {
      const pricingData: Record<string, unknown> = {};
      const inputPrice = Number.parseFloat(formData.llmInputPrice);
      const outputPrice = Number.parseFloat(formData.llmOutputPrice);
      if (formData.minimumCharge) {
        pricingData.llm = {
          inputPrice,
          outputPrice,
          currency: formData.currency,
          minimumCharge: Number.parseFloat(formData.minimumCharge),
        };
      } else {
        pricingData.llm = {
          inputPrice,
          outputPrice,
          currency: formData.currency,
        };
      }

      await modelsApi.updateModelPricing(editingModel.id, pricingData);

      if (onUpdate) {
        onUpdate();
      }

      setEditingModel(null);
      setFormData(initialFormState);
    } catch (error) {
      console.error('Failed to update model pricing:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getModelTypeBadge = (adapterType: string) => {
    if (adapterType === 'paddlex') {
      return <Badge className="bg-amber-100 text-amber-800">Legacy OCR</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-800">LLM</Badge>;
  };

  const formatPricing = (model: Model) => {
    const inputPrice = model.pricing?.llm?.inputPrice ?? 0;
    const outputPrice = model.pricing?.llm?.outputPrice ?? 0;
    const currency = formatCurrencyCode(model.pricing?.llm?.currency);
    return `${formatTokenPrice(inputPrice)} in / ${formatTokenPrice(outputPrice)} out per 1M ${currency}`;
  };

  const formatHistoryEntry = (entry: PricingHistoryEntry) => {
    if (entry.llm?.inputPrice !== undefined && entry.llm?.outputPrice !== undefined) {
      const currency = formatCurrencyCode(entry.llm.currency);
      return `${formatTokenPrice(entry.llm.inputPrice)} in / ${formatTokenPrice(entry.llm.outputPrice)} out ${currency}`;
    }
    return 'Not set';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Model Pricing Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure pricing for LLM models used in extraction
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current Pricing</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => {
              const isEditing = editingModel?.id === model.id;
              const isExpanded = expandedIds.has(model.id);

              return (
                <Fragment key={model.id}>
                  <TableRow>
                    <TableCell className="w-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleExpanded(model.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{getModelTypeBadge(model.adapterType)}</TableCell>
                    <TableCell>{formatPricing(model)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {model.pricing?.effectiveDate
                        ? new Date(model.pricing.effectiveDate).toLocaleDateString()
                        : 'Not set'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(model)}
                        disabled={!!editingModel}
                      >
                        {isEditing ? <CheckCircle2 className="h-4 w-4" /> : 'Edit'}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row - Edit Form */}
                  {isExpanded && isEditing && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Edit Pricing: {model.name}</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving || !formData.currency.trim()}
                              >
                                {isSaving ? (
                                  <>
                                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="llm-input-price">Input Price (per 1M tokens)</Label>
                              <Input
                                id="llm-input-price"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={formData.llmInputPrice}
                                onChange={(e) => setFormData({ ...formData, llmInputPrice: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="llm-output-price">Output Price (per 1M tokens)</Label>
                              <Input
                                id="llm-output-price"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={formData.llmOutputPrice}
                                onChange={(e) => setFormData({ ...formData, llmOutputPrice: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="llm-currency">Currency</Label>
                              <Select
                                value={formData.currency || undefined}
                                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                              >
                                <SelectTrigger id="llm-currency" className="mt-1">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="CNY">CNY</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Minimum Charge (both) */}
                            <div>
                              <Label htmlFor="min-charge">Minimum Charge (Optional)</Label>
                              <Input
                                id="min-charge"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={formData.minimumCharge}
                                onChange={(e) => setFormData({ ...formData, minimumCharge: e.target.value })}
                                className="mt-1"
                                placeholder="No minimum charge"
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Expanded Row - Pricing History */}
                  {isExpanded && !isEditing && model.pricingHistory && model.pricingHistory.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Pricing History</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowHistory((prev) => ({ ...prev, [model.id]: !prev[model.id] }))}
                            >
                              {showHistory[model.id] ? 'Hide' : 'Show'}
                            </Button>
                          </div>

                          {showHistory[model.id] && (
                            <div className="space-y-2 mt-2">
                              {model.pricingHistory.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-xs rounded-md border border-border px-3 py-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {entry.effectiveDate
                                        ? new Date(entry.effectiveDate).toLocaleDateString()
                                        : 'Unknown'}
                                    </span>
                                    {entry.endDate && (
                                      <span className="text-muted-foreground">
                                        to {new Date(entry.endDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-muted-foreground">
                                    {formatHistoryEntry(entry)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        {models.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No models found. Add models to configure pricing.
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
        <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">About Model Pricing</p>
          <p className="text-xs">
            LLM pricing is charged per 1M tokens (input and output). When you update pricing,
            the old pricing is saved to history for reference. Costs are calculated using the
            pricing effective at the time of extraction.
          </p>
        </div>
      </div>
    </div>
  );
}
