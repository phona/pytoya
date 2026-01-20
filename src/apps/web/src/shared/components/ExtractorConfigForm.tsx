import { Control, FieldPath } from 'react-hook-form';
import { Switch } from '@/shared/components/ui/switch';
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
import { SecureApiKeyInput } from '@/shared/components/SecureApiKeyInput';
import type { ExtractorParamDefinition, ExtractorParamSchema } from '@/api/extractors';
import type { ExtractorFormValues } from '@/shared/schemas/extractor.schema';

type ExtractorConfigFormProps = {
  schema: ExtractorParamSchema;
  control: Control<ExtractorFormValues>;
  prefix?: string;
};

export function ExtractorConfigForm({ schema, control, prefix = 'config' }: ExtractorConfigFormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {(Object.entries(schema) as Array<[string, ExtractorParamDefinition]>).map(([key, definition]) => {
        const fieldName = `${prefix}.${key}`;
        const isBoolean = definition.type === 'boolean';
        const isEnum = definition.type === 'enum';
        const isNumber = definition.type === 'number';
        const isSecret = Boolean(definition.secret);

        if (isBoolean) {
          return (
            <FormField
              key={key}
              control={control}
              name={fieldName as FieldPath<ExtractorFormValues>}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <FormLabel htmlFor={fieldName}>{definition.label}</FormLabel>
                  <FormControl>
                    <Switch
                      id={fieldName}
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
              control={control}
              name={fieldName as FieldPath<ExtractorFormValues>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={fieldName}>
                    {definition.label}
                    {definition.required ? ' *' : ''}
                  </FormLabel>
                  <Select
                    value={(field.value as string) || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  >
                    <FormControl>
                      <SelectTrigger id={fieldName}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!definition.required && <SelectItem value="none">Select...</SelectItem>}
                      {options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {definition.helpText && <FormDescription>{definition.helpText}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        if (isSecret) {
          return (
            <FormField
              key={key}
              control={control}
              name={fieldName as FieldPath<ExtractorFormValues>}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SecureApiKeyInput
                      id={fieldName}
                      label={`${definition.label}${definition.required ? ' *' : ''}`}
                      value={field.value as string}
                      onChange={field.onChange}
                      placeholder={definition.placeholder}
                      helperText={definition.helpText}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        return (
          <FormField
            key={key}
            control={control}
            name={fieldName as FieldPath<ExtractorFormValues>}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={fieldName}>
                  {definition.label}
                  {definition.required ? ' *' : ''}
                </FormLabel>
                <FormControl>
                  <Input
                    id={fieldName}
                    type={isNumber ? 'number' : 'text'}
                    value={field.value === undefined ? '' : String(field.value)}
                    onChange={field.onChange}
                    placeholder={definition.placeholder}
                    min={definition.validation?.min}
                    max={definition.validation?.max}
                    step={isNumber ? 'any' : undefined}
                  />
                </FormControl>
                {definition.helpText && <FormDescription>{definition.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
}
