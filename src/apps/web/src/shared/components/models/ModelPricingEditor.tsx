import { useEffect, useState } from 'react';
import { getApiErrorText } from '@/api/client';
import type { Model } from '@/api/models';
import { modelsApi } from '@/api/models';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useI18n } from '@/shared/providers/I18nProvider';

interface ModelPricingEditorProps {
  model: Model;
  onUpdated?: (updated: Model) => void;
  onUpdateDone?: () => void;
}

const toNonNegativeNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

const UNSET_CURRENCY = '__unset__';

export function ModelPricingEditor({ model, onUpdated, onUpdateDone }: ModelPricingEditorProps) {
  const { t } = useI18n();
  const [llmInputPrice, setLlmInputPrice] = useState('0');
  const [llmOutputPrice, setLlmOutputPrice] = useState('0');
  const [currency, setCurrency] = useState(() => model.pricing?.llm?.currency ?? UNSET_CURRENCY);
  const [minimumCharge, setMinimumCharge] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLlmInputPrice((model.pricing?.llm?.inputPrice ?? 0).toString());
    setLlmOutputPrice((model.pricing?.llm?.outputPrice ?? 0).toString());
    setCurrency(model.pricing?.llm?.currency ?? UNSET_CURRENCY);
    setMinimumCharge(
      model.pricing?.llm?.minimumCharge === undefined
        ? ''
        : model.pricing.llm.minimumCharge.toString(),
    );
  }, [
    model.id,
    model.pricing?.llm?.inputPrice,
    model.pricing?.llm?.outputPrice,
    model.pricing?.llm?.currency,
    model.pricing?.llm?.minimumCharge,
  ]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    if (currency === UNSET_CURRENCY) {
      setSaveError('Currency is required');
      return;
    }
    setIsSaving(true);
    try {
      const inputPrice = toNonNegativeNumber(llmInputPrice);
      const outputPrice = toNonNegativeNumber(llmOutputPrice);
      const minCharge = minimumCharge.trim() ? toNonNegativeNumber(minimumCharge) : undefined;

      const updated = await modelsApi.updateModelPricing(model.id, {
        llm: {
          inputPrice,
          outputPrice,
          currency,
          ...(minCharge === undefined ? {} : { minimumCharge: minCharge }),
        },
      });

      setSaveSuccess(t('models.pricingSaved'));
      onUpdated?.(updated);
      onUpdateDone?.();
    } catch (error) {
      setSaveError(getApiErrorText(error, t));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="llm-input-price">{t('models.pricingInputPrice')}</Label>
          <Input
            id="llm-input-price"
            type="number"
            step="0.0001"
            min="0"
            value={llmInputPrice}
            onChange={(e) => setLlmInputPrice(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="llm-output-price">{t('models.pricingOutputPrice')}</Label>
          <Input
            id="llm-output-price"
            type="number"
            step="0.0001"
            min="0"
            value={llmOutputPrice}
            onChange={(e) => setLlmOutputPrice(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="llm-currency">{t('models.pricingCurrency')}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="llm-currency" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET_CURRENCY} disabled>
                Select currency
              </SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="CNY">CNY</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="llm-minimum-charge">{t('models.pricingMinimumCharge')}</Label>
          <Input
            id="llm-minimum-charge"
            type="number"
            step="0.0001"
            min="0"
            value={minimumCharge}
            onChange={(e) => setMinimumCharge(e.target.value)}
            className="mt-1"
            placeholder={t('models.pricingMinimumChargePlaceholder')}
          />
        </div>
      </div>

      {saveError ? <div className="text-sm text-destructive">{saveError}</div> : null}
      {saveSuccess ? <div className="text-sm text-emerald-600">{saveSuccess}</div> : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isSaving || currency === UNSET_CURRENCY}>
          {isSaving ? t('models.pricingSaving') : t('models.pricingSave')}
        </Button>
      </div>
    </div>
  );
}
