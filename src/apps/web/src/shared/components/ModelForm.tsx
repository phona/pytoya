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
  onSubmit: (data: CreateModelDto | UpdateModelDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

type FieldValue = string | number | boolean | undefined;

export function ModelForm({ adapter, model, onSubmit, onCancel, isLoading }: ModelFormProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

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

  const handleSubmit = async (values: ModelFormValues) => {
    const parameters = Object.entries(values.parameters).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const definition = adapter.parameters[key];
        let normalizedValue: unknown = value;

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
      const data: UpdateModelDto = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        parameters,
        isActive: values.isActive,
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
              <FormItem className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
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
                    <FormItem className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
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
                            className="absolute right-2 top-2 text-xs text-gray-500"
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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : model ? 'Update Model' : 'Create Model'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
