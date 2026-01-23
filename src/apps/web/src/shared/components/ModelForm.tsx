import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AdapterSchema, CreateModelDto, Model, UpdateModelDto } from '@/api/models';
import { buildModelSchema, type ModelFormValues } from '@/shared/schemas/model.schema';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';

type ModelFormProps = {
  adapter: AdapterSchema;
  model?: Model;
  canEditPricing?: boolean;
  onSubmit: (data: CreateModelDto | UpdateModelDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

type FieldValue = string | number | boolean | undefined;

const MASKED_SECRET = '********';

const toNonNegativeNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

const pricingSnapshotKey = (input: number, output: number, currency: string, minimumCharge?: number) =>
  JSON.stringify({
    input,
    output,
    currency,
    minimumCharge: minimumCharge === undefined ? null : minimumCharge,
  });

export function ModelForm({
  adapter,
  model,
  canEditPricing = false,
  onSubmit,
  onCancel,
  isLoading,
}: ModelFormProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [pricingInput, setPricingInput] = useState('0');
  const [pricingOutput, setPricingOutput] = useState('0');
  const [pricingCurrency, setPricingCurrency] = useState(() => model?.pricing?.llm?.currency ?? '');
  const [pricingMinimumCharge, setPricingMinimumCharge] = useState('');

  const allowPricingEdits = Boolean(model && adapter.category === 'llm' && canEditPricing);

  const defaultParameters = useMemo(() => {
    const values: Record<string, FieldValue> = {};
    Object.entries(adapter.parameters).forEach(([key, definition]) => {
      const current = model?.parameters?.[key];
      if (current !== undefined && current !== null) {
        values[key] = current as FieldValue;
      } else if (definition.default !== undefined) {
        values[key] = definition.default as FieldValue;
      } else {
        values[key] = definition.type === 'boolean' ? false : '';
      }
    });
    return values;
  }, [adapter, model]);

  const schema = useMemo(() => buildModelSchema(adapter), [adapter]);

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: model?.name ?? '',
      description: model?.description ?? '',
      isActive: model?.isActive ?? true,
      parameters: defaultParameters,
    },
  });

  useEffect(() => {
    form.reset({
      name: model?.name ?? '',
      description: model?.description ?? '',
      isActive: model?.isActive ?? true,
      parameters: defaultParameters,
    });
  }, [defaultParameters, form, model]);

  const initialPricingKey = useMemo(() => {
    const input = model?.pricing?.llm?.inputPrice ?? 0;
    const output = model?.pricing?.llm?.outputPrice ?? 0;
    const currency = model?.pricing?.llm?.currency ?? '';
    const minimumCharge = model?.pricing?.llm?.minimumCharge;
    return pricingSnapshotKey(input, output, currency, minimumCharge);
  }, [
    model?.pricing?.llm?.inputPrice,
    model?.pricing?.llm?.outputPrice,
    model?.pricing?.llm?.currency,
    model?.pricing?.llm?.minimumCharge,
  ]);

  const currentPricingKey = useMemo(() => {
    if (!allowPricingEdits) return initialPricingKey;
    return pricingSnapshotKey(
      toNonNegativeNumber(pricingInput),
      toNonNegativeNumber(pricingOutput),
      pricingCurrency,
      pricingMinimumCharge.trim()
        ? toNonNegativeNumber(pricingMinimumCharge)
        : undefined,
    );
  }, [
    allowPricingEdits,
    initialPricingKey,
    pricingCurrency,
    pricingInput,
    pricingMinimumCharge,
    pricingOutput,
  ]);

  const pricingChanged = allowPricingEdits && currentPricingKey !== initialPricingKey;

  useEffect(() => {
    if (!model?.id || adapter.category !== 'llm') return;
    setPricingInput((model.pricing?.llm?.inputPrice ?? 0).toString());
    setPricingOutput((model.pricing?.llm?.outputPrice ?? 0).toString());
    setPricingCurrency(model.pricing?.llm?.currency ?? '');
    setPricingMinimumCharge(
      model.pricing?.llm?.minimumCharge === undefined
        ? ''
        : model.pricing.llm.minimumCharge.toString(),
    );
  }, [
    adapter.category,
    model?.id,
    model?.pricing?.llm?.inputPrice,
    model?.pricing?.llm?.outputPrice,
    model?.pricing?.llm?.currency,
    model?.pricing?.llm?.minimumCharge,
  ]);

  const handleSubmit = async (values: ModelFormValues) => {
    const parameters = Object.entries(values.parameters).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const definition = adapter.parameters[key];
        let normalizedValue: unknown = value;

        if (model && definition?.secret && normalizedValue === MASKED_SECRET) {
          return acc;
        }

        if (definition?.type === 'number') {
          if (value === undefined || value === null || value === '') {
            return acc;
          }
          const parsed = typeof value === 'number' ? value : Number(value);
          normalizedValue = Number.isFinite(parsed) ? parsed : value;
        }

        if (normalizedValue === undefined || normalizedValue === null || normalizedValue === '') {
          return acc;
        }
        acc[key] = normalizedValue;
        return acc;
      },
      {},
    );

    if (model) {
      const nextPricingKey = allowPricingEdits
        ? pricingSnapshotKey(
            toNonNegativeNumber(pricingInput),
            toNonNegativeNumber(pricingOutput),
            pricingCurrency,
            pricingMinimumCharge.trim()
              ? toNonNegativeNumber(pricingMinimumCharge)
              : undefined,
          )
        : initialPricingKey;
      const pricingChanged = allowPricingEdits && nextPricingKey !== initialPricingKey;

      const pricing = pricingChanged
        ? {
            llm: {
              inputPrice: toNonNegativeNumber(pricingInput),
              outputPrice: toNonNegativeNumber(pricingOutput),
              currency: pricingCurrency,
              ...(pricingMinimumCharge.trim()
                ? { minimumCharge: toNonNegativeNumber(pricingMinimumCharge) }
                : {}),
            },
          }
        : undefined;

      const data: UpdateModelDto = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        parameters,
        isActive: values.isActive,
        ...(pricing ? { pricing } : {}),
      };
      await onSubmit(data);
      return;
    }
    const data: CreateModelDto = {
      name: values.name.trim(),
      adapterType: adapter.type,
      description: values.description?.trim() || undefined,
      parameters,
      isActive: values.isActive,
    };
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="model-name">Name *</FormLabel>
                <FormControl>
                  <Input {...field} id="model-name" aria-label="Model name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="space-y-0.5">
                  <FormLabel htmlFor="model-active">Active</FormLabel>
                  <FormDescription>Toggle to enable this model.</FormDescription>
                </div>
                <FormControl>
                  <Switch id="model-active" checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="model-description">Description</FormLabel>
              <FormControl>
                <Input {...field} id="model-description" aria-label="Model description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(adapter.parameters).map(([key, definition]) => {
            const fieldId = `model-param-${key}`;
            const isSecret = Boolean(definition.secret);
            const isNumber = definition.type === 'number';
            const isBoolean = definition.type === 'boolean';
            const isEnum = definition.type === 'enum';
            const fieldName = `parameters.${key}` as const;

            if (isBoolean) {
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <FormLabel htmlFor={fieldId}>{definition.label}</FormLabel>
                      <FormControl>
                        <Switch
                          id={fieldId}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            }

            if (isEnum) {
              const options = definition.validation?.enum ?? [];
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor={fieldId}>
                        {definition.label}
                        {definition.required ? ' *' : ''}
                      </FormLabel>
                      <Select
                        value={(field.value as string) || 'none'}
                        onValueChange={(value) =>
                          field.onChange(value === 'none' ? '' : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger id={fieldId} aria-label={definition.label}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!definition.required && (
                            <SelectItem value="none">Select...</SelectItem>
                          )}
                          {options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {definition.helpText && (
                        <FormDescription>{definition.helpText}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            }

            return (
              <FormField
                key={key}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={fieldId}>
                      {definition.label}
                      {definition.required ? ' *' : ''}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id={fieldId}
                          type={isSecret && !showSecrets[key] ? 'password' : isNumber ? 'number' : 'text'}
                          aria-label={definition.label}
                          placeholder={definition.placeholder ?? ''}
                          min={definition.validation?.min}
                          max={definition.validation?.max}
                          step={isNumber ? 'any' : undefined}
                          value={field.value === undefined ? '' : String(field.value)}
                          onChange={field.onChange}
                        />
                        {isSecret && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                            className="absolute right-2 top-2 text-xs text-muted-foreground"
                            aria-pressed={Boolean(showSecrets[key])}
                            aria-label="Toggle secret visibility"
                            aria-controls={fieldId}
                          >
                            {showSecrets[key] ? 'Hide' : 'Show'}
                          </button>
                        )}
                      </div>
                    </FormControl>
                    {definition.helpText && (
                      <FormDescription>{definition.helpText}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </div>

        {allowPricingEdits && canEditPricing ? (
          <div className="space-y-3 pt-2">
            <div>
              <div className="text-sm font-medium text-foreground">Pricing</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Charged per 1M tokens (input and output).
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="llm-input-price">Input price (per 1M tokens)</Label>
                <Input
                  id="llm-input-price"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={pricingInput}
                  onChange={(e) => setPricingInput(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="llm-output-price">Output price (per 1M tokens)</Label>
                <Input
                  id="llm-output-price"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={pricingOutput}
                  onChange={(e) => setPricingOutput(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="llm-currency">Currency</Label>
                <Select value={pricingCurrency || undefined} onValueChange={setPricingCurrency}>
                  <SelectTrigger id="llm-currency" className="mt-1" aria-label="Currency">
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
              <div>
                <Label htmlFor="llm-minimum-charge">Minimum charge (optional)</Label>
                <Input
                  id="llm-minimum-charge"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={pricingMinimumCharge}
                  onChange={(e) => setPricingMinimumCharge(e.target.value)}
                  className="mt-1"
                  placeholder="No minimum charge"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={Boolean(isLoading || (pricingChanged && !pricingCurrency.trim()))}>
            {isLoading ? 'Saving...' : model ? 'Update Model' : 'Create Model'}
          </Button>
        </div>
      </form>
    </Form>
  );
}




