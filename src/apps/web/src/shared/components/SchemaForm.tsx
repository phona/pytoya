import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateSchemaDto, UpdateSchemaDto, Schema } from '@/api/schemas';
import { useProjects } from '@/shared/hooks/use-projects';
import { JSONSchemaEditor } from '@/shared/components/JSONSchemaEditor';
import { SchemaVisualBuilder } from '@/shared/components/SchemaVisualBuilder';
import { schemaFormSchema, type SchemaFormValues } from '@/shared/schemas/schema.schema';
import { Button } from '@/shared/components/ui/button';
import { canonicalizeJsonSchemaForDisplay } from '@/shared/utils/schema';
import { useI18n } from '@/shared/providers/I18nProvider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface SchemaFormProps {
  schema?: Schema;
  onSubmit: (data: CreateSchemaDto | UpdateSchemaDto) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  isLoading?: boolean;
}

const DEFAULT_SCHEMA = JSON.stringify(
  {
    type: 'object',
    properties: {},
    required: [],
  },
  null,
  2,
);

export function SchemaForm({ schema, onSubmit, onCancel, onDirtyChange, isLoading }: SchemaFormProps) {
  const { t } = useI18n();
  const { projects } = useProjects();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('code');

  const form = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaFormSchema),
    defaultValues: {
      projectId: schema?.projectId?.toString() ?? '',
      jsonSchema: schema?.jsonSchema
        ? JSON.stringify(canonicalizeJsonSchemaForDisplay(schema.jsonSchema as Record<string, unknown>), null, 2)
        : DEFAULT_SCHEMA,
    },
  });

  useEffect(() => {
    form.reset({
      projectId: schema?.projectId?.toString() ?? '',
      jsonSchema: schema?.jsonSchema
        ? JSON.stringify(canonicalizeJsonSchemaForDisplay(schema.jsonSchema as Record<string, unknown>), null, 2)
        : DEFAULT_SCHEMA,
    });
  }, [form, schema]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    if (jsonError) {
      form.setError('jsonSchema', { type: 'validate', message: 'Invalid JSON' });
    } else {
      form.clearErrors('jsonSchema');
    }
  }, [form, jsonError]);

  const handleSubmit = async (values: SchemaFormValues) => {
    let parsedJsonSchema: Record<string, unknown>;
    try {
      parsedJsonSchema = JSON.parse(values.jsonSchema);
    } catch {
      return;
    }

    if (schema) {
      const updateData: UpdateSchemaDto = {
        jsonSchema: parsedJsonSchema,
      };
      await onSubmit(updateData);
      return;
    }

    const data: CreateSchemaDto = {
      jsonSchema: parsedJsonSchema,
      projectId: parseInt(values.projectId, 10),
    };
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="schema-project">Project *</FormLabel>
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                disabled={!!schema}
              >
                <FormControl>
                  <SelectTrigger id="schema-project">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Select a project...</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jsonSchema"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>JSON Schema *</FormLabel>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={editorMode === 'visual' ? 'default' : 'outline'}
                    onClick={() => setEditorMode('visual')}
                  >
                    Visual Builder
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={editorMode === 'code' ? 'default' : 'outline'}
                    onClick={() => setEditorMode('code')}
                  >
                    Code Editor
                  </Button>
                </div>
              </div>
              {editorMode === 'visual' ? (
                <div className="mt-2">
                  <SchemaVisualBuilder
                    schema={JSON.parse(field.value || DEFAULT_SCHEMA)}
                    onChange={(newSchema) => {
                      const newJsonSchema = JSON.stringify(canonicalizeJsonSchemaForDisplay(newSchema), null, 2);
                      field.onChange(newJsonSchema);
                    }}
                  />
                  <FormDescription>
                    Use the visual builder to create and edit schema properties. Switch to code editor for advanced editing.
                  </FormDescription>
                </div>
              ) : (
                <div className="mt-2">
                  <JSONSchemaEditor
                    value={field.value}
                    onChange={field.onChange}
                    onError={setJsonError}
                    placeholder='{"type": "object", "properties": {...}, "required": [...]}'
                    rows={15}
                  />
                  <FormDescription>
                    Enter a valid JSON Schema. This defines the structure for data extraction.
                  </FormDescription>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isLoading || !!jsonError}>
          {isLoading ? t('common.saving') : schema ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  </Form>
  );
}




