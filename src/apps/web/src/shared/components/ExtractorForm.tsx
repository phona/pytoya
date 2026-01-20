import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FieldPath } from 'react-hook-form';
import {
  CreateExtractorDto,
  UpdateExtractorDto,
  Extractor,
  ExtractorType,
  ExtractorPreset,
  ExtractorParamDefinition,
  ExtractorParamSchema,
} from '@/api/extractors';
import { extractorFormSchema, type ExtractorFormValues } from '@/shared/schemas/extractor.schema';
import { ExtractorConfigForm } from '@/shared/components/ExtractorConfigForm';
import { PricingConfigForm } from '@/shared/components/PricingConfigForm';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';

type ExtractorFormProps = {
  types: ExtractorType[];
  presets?: ExtractorPreset[];
  extractor?: Extractor;
  onSubmit: (data: CreateExtractorDto | UpdateExtractorDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

const buildDefaultConfig = (
  schema?: ExtractorParamSchema,
  existing?: Record<string, unknown>,
) => {
  if (!schema) return existing ?? {};
  const values: Record<string, unknown> = {};
  (Object.entries(schema) as Array<[string, ExtractorParamDefinition]>).forEach(([key, definition]) => {
    const existingValue = existing?.[key];
    if (existingValue !== undefined && existingValue !== null) {
      values[key] = existingValue;
      return;
    }
    if (definition.default !== undefined) {
      values[key] = definition.default;
      return;
    }
    if (definition.type === 'boolean') {
      values[key] = false;
      return;
    }
    values[key] = '';
  });
  return values;
};

const buildDefaultPricing = (
  schema?: ExtractorParamSchema,
  existing?: Record<string, unknown>,
) => {
  if (!schema) return existing ?? {};
  const defaults = buildDefaultConfig(schema, existing);
  if (!('mode' in defaults)) {
    defaults.mode = 'none';
  }
  if (!('currency' in defaults)) {
    defaults.currency = 'USD';
  }
  return defaults;
};

const sanitizeValues = (
  input: Record<string, unknown> | undefined,
  schema?: ExtractorParamSchema,
) => {
  if (!schema) return input ?? {};
  const output: Record<string, unknown> = {};
  (Object.entries(schema) as Array<[string, ExtractorParamDefinition]>).forEach(([key, definition]) => {
    const rawValue = input?.[key];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return;
    }
    if (definition.type === 'number') {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isFinite(parsed)) {
        return;
      }
      output[key] = parsed;
      return;
    }
    output[key] = rawValue;
  });
  return output;
};

export function ExtractorForm({
  types,
  presets = [],
  extractor,
  onSubmit,
  onCancel,
  isLoading,
}: ExtractorFormProps) {
  const form = useForm<ExtractorFormValues>({
    resolver: zodResolver(extractorFormSchema),
    defaultValues: {
      name: extractor?.name ?? '',
      description: extractor?.description ?? '',
      extractorType: extractor?.extractorType ?? types[0]?.id ?? '',
      isActive: extractor?.isActive ?? true,
      config: extractor?.config ?? {},
    },
  });

  const selectedTypeId = form.watch('extractorType');
  const activeType = useMemo(
    () => types.find((type) => type.id === selectedTypeId),
    [selectedTypeId, types],
  );

  const defaultConfig = useMemo(() => {
    return buildDefaultConfig(activeType?.paramsSchema, extractor?.config);
  }, [activeType?.paramsSchema, extractor?.config]);

  const defaultPricing = useMemo(() => {
    return buildDefaultPricing(
      activeType?.pricingSchema,
      (extractor?.config as { pricing?: Record<string, unknown> } | undefined)?.pricing,
    );
  }, [activeType?.pricingSchema, extractor?.config]);

  useEffect(() => {
    form.reset({
      name: extractor?.name ?? '',
      description: extractor?.description ?? '',
      extractorType: extractor?.extractorType ?? activeType?.id ?? types[0]?.id ?? '',
      isActive: extractor?.isActive ?? true,
      config: {
        ...defaultConfig,
        pricing: defaultPricing,
      },
    });
  }, [activeType?.id, defaultConfig, defaultPricing, extractor, form, types]);

  const validateRequiredFields = (schema?: ExtractorParamSchema, prefix = 'config') => {
    if (!schema) return true;
    let valid = true;
    (Object.entries(schema) as Array<[string, ExtractorParamDefinition]>).forEach(([key, definition]) => {
      if (!definition.required) return;
      const fieldPath = `${prefix}.${key}` as FieldPath<ExtractorFormValues>;
      const value = form.getValues(fieldPath);
      if (value === undefined || value === null || value === '') {
        form.setError(fieldPath, {
          type: 'required',
          message: `${definition.label} is required`,
        });
        valid = false;
      }
    });
    return valid;
  };

  const handleSubmit = async (values: ExtractorFormValues) => {
    const isConfigValid = validateRequiredFields(activeType?.paramsSchema, 'config');
    const isPricingValid = validateRequiredFields(activeType?.pricingSchema, 'config.pricing');
    if (!isConfigValid || !isPricingValid) {
      return;
    }

    const config = sanitizeValues(values.config ?? {}, activeType?.paramsSchema);
    const pricing = sanitizeValues(
      (values.config as { pricing?: Record<string, unknown> } | undefined)?.pricing,
      activeType?.pricingSchema,
    );

    if (Object.keys(pricing).length > 0) {
      config.pricing = pricing;
    }

    if (extractor) {
      const updateData: UpdateExtractorDto = {
        name: (values.name ?? '').trim(),
        description: values.description?.trim() || undefined,
        config,
        isActive: values.isActive ?? true,
      };
      await onSubmit(updateData);
      return;
    }

    const data: CreateExtractorDto = {
      name: (values.name ?? '').trim(),
      description: values.description?.trim() || undefined,
      extractorType: values.extractorType ?? activeType?.id ?? '',
      config,
      isActive: values.isActive ?? true,
    };
    await onSubmit(data);
  };

  const presetsForType = presets.filter((preset) => preset.extractorType === activeType?.id);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {!extractor && (
          <FormField
            control={form.control}
            name="extractorType"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="extractor-type">Extractor Type *</FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger id="extractor-type">
                      <SelectValue placeholder="Select extractor type..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {activeType?.description ?? 'Choose a text extractor type.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {presetsForType.length > 0 && !extractor && (
          <FormField
            control={form.control}
            name="name"
            render={() => (
              <FormItem>
                <FormLabel>Preset (Optional)</FormLabel>
                <Select
                  value="none"
                  onValueChange={(value) => {
                    if (value === 'none') return;
                    const preset = presetsForType.find((item) => item.id === value);
                    if (!preset) return;
                    form.setValue('name', preset.name);
                    form.setValue('description', preset.description ?? '');
                    form.setValue('config', preset.config as ExtractorFormValues['config']);
                  }}
                >
                  <FormControl>
                    <SelectTrigger id="extractor-preset">
                      <SelectValue placeholder="Choose a preset..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No preset</SelectItem>
                    {presetsForType.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Apply preset settings to speed up configuration.
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="extractor-name">Name *</FormLabel>
                <FormControl>
                  <Input id="extractor-name" {...field} />
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
                  <FormLabel htmlFor="extractor-active">Active</FormLabel>
                  <FormDescription>Enable this extractor for use.</FormDescription>
                </div>
                <FormControl>
                  <Switch id="extractor-active" checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="extractor-description">Description</FormLabel>
              <FormControl>
                <Input id="extractor-description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {activeType && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
              <p className="text-xs text-muted-foreground">
                Configure connection and extraction parameters.
              </p>
            </div>
            <ExtractorConfigForm schema={activeType.paramsSchema} control={form.control} />
          </div>
        )}

        {activeType?.pricingSchema && (
          <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pricing Configuration</h3>
              <p className="text-xs text-muted-foreground">
                Used to calculate text extraction costs.
              </p>
            </div>
            <PricingConfigForm schema={activeType.pricingSchema} control={form.control} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : extractor ? 'Update Extractor' : 'Create Extractor'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
