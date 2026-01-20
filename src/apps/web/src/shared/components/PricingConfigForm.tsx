import { Control, FieldPath, useWatch } from 'react-hook-form';
import {
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
import type { ExtractorParamSchema } from '@/api/extractors';
import type { ExtractorFormValues } from '@/shared/schemas/extractor.schema';

type PricingConfigFormProps = {
  schema: ExtractorParamSchema;
  control: Control<ExtractorFormValues>;
};

const currencyOptions = ['USD', 'EUR', 'GBP', 'CNY'];

export function PricingConfigForm({ schema, control }: PricingConfigFormProps) {
  const modeField = 'config.pricing.mode' as FieldPath<ExtractorFormValues>;
  const currencyField = 'config.pricing.currency' as FieldPath<ExtractorFormValues>;
  const inputPriceField = 'config.pricing.inputPricePerMillionTokens' as FieldPath<ExtractorFormValues>;
  const outputPriceField = 'config.pricing.outputPricePerMillionTokens' as FieldPath<ExtractorFormValues>;
  const pricePerPageField = 'config.pricing.pricePerPage' as FieldPath<ExtractorFormValues>;
  const fixedCostField = 'config.pricing.fixedCost' as FieldPath<ExtractorFormValues>;
  const minimumChargeField = 'config.pricing.minimumCharge' as FieldPath<ExtractorFormValues>;
  const mode = useWatch({ control, name: modeField }) as string | undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {schema.mode && (
          <FormField
            control={control}
            name={modeField}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pricing-mode">Pricing Mode *</FormLabel>
                <Select value={(field.value as string) || 'none'} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger id="pricing-mode">
                      <SelectValue placeholder="Select pricing mode..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(schema.mode.validation?.enum ?? ([] as string[])).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {schema.currency && (
          <FormField
            control={control}
            name={currencyField}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pricing-currency">Currency *</FormLabel>
                <Select value={(field.value as string) || 'USD'} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger id="pricing-currency">
                      <SelectValue placeholder="Select currency..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {mode === 'token' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={control}
            name={inputPriceField}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pricing-input">Input Price (per 1M tokens)</FormLabel>
                <FormControl>
                  <Input
                    id="pricing-input"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={field.value === undefined ? '' : String(field.value)}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={outputPriceField}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pricing-output">Output Price (per 1M tokens)</FormLabel>
                <FormControl>
                  <Input
                    id="pricing-output"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={field.value === undefined ? '' : String(field.value)}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {mode === 'page' && (
        <FormField
          control={control}
          name={pricePerPageField}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="pricing-page">Price Per Page</FormLabel>
              <FormControl>
                <Input
                  id="pricing-page"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={field.value === undefined ? '' : String(field.value)}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {mode === 'fixed' && (
        <FormField
          control={control}
          name={fixedCostField}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="pricing-fixed">Fixed Cost</FormLabel>
              <FormControl>
                <Input
                  id="pricing-fixed"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={field.value === undefined ? '' : String(field.value)}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {schema.minimumCharge && (
        <FormField
          control={control}
          name={minimumChargeField}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="pricing-minimum">Minimum Charge (Optional)</FormLabel>
              <FormControl>
                <Input
                  id="pricing-minimum"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={field.value === undefined ? '' : String(field.value)}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Minimum charge applied per extraction when costs are low.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
