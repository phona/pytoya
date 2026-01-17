import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateSchemaDto, UpdateSchemaDto, Schema, ExtractionStrategy } from '@/api/schemas';
import { useProjects } from '@/shared/hooks/use-projects';
import { JSONSchemaEditor } from '@/shared/components/JSONSchemaEditor';
import { SchemaVisualBuilder } from '@/shared/components/SchemaVisualBuilder';
import { ExtractionStrategySelector } from '@/shared/components/ExtractionStrategySelector';
import { schemaFormSchema, type SchemaFormValues } from '@/shared/schemas/schema.schema';
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
import { Textarea } from '@/shared/components/ui/textarea';

interface SchemaFormProps {
  schema?: Schema;
  templates?: Schema[];
  onSubmit: (data: CreateSchemaDto | UpdateSchemaDto) => Promise<void>;
  onCancel: () => void;
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

export function SchemaForm({ schema, templates = [], onSubmit, onCancel, isLoading }: SchemaFormProps) {
  const { projects } = useProjects();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('code');

  const form = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaFormSchema),
    defaultValues: {
      name: schema?.name ?? '',
      description: schema?.description ?? '',
      projectId: schema?.projectId?.toString() ?? '',
      jsonSchema: schema?.jsonSchema ? JSON.stringify(schema.jsonSchema, null, 2) : DEFAULT_SCHEMA,
      requiredFields: schema?.requiredFields?.join('\n') ?? '',
      extractionStrategy: schema?.extractionStrategy ?? null,
    },
  });

  useEffect(() => {
    form.reset({
      name: schema?.name ?? '',
      description: schema?.description ?? '',
      projectId: schema?.projectId?.toString() ?? '',
      jsonSchema: schema?.jsonSchema ? JSON.stringify(schema.jsonSchema, null, 2) : DEFAULT_SCHEMA,
      requiredFields: schema?.requiredFields?.join('\n') ?? '',
      extractionStrategy: schema?.extractionStrategy ?? null,
    });
    setSelectedTemplate('');
  }, [form, schema]);

  useEffect(() => {
    if (jsonError) {
      form.setError('jsonSchema', { type: 'validate', message: 'Invalid JSON' });
    } else {
      form.clearErrors('jsonSchema');
    }
  }, [form, jsonError]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id.toString() === templateId);
    if (!template) {
      setSelectedTemplate('');
      return;
    }

    setSelectedTemplate(templateId);
    form.setValue('jsonSchema', JSON.stringify(template.jsonSchema, null, 2), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('requiredFields', template.requiredFields.join('\n'), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = async (values: SchemaFormValues) => {
    let parsedJsonSchema: Record<string, unknown>;
    try {
      parsedJsonSchema = JSON.parse(values.jsonSchema);
    } catch {
      return;
    }

    const fieldsArray = (values.requiredFields ?? '')
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (schema) {
      const updateData: UpdateSchemaDto = {
        name: values.name.trim() || undefined,
        jsonSchema: parsedJsonSchema,
        requiredFields: fieldsArray,
        description: values.description?.trim() || undefined,
        extractionStrategy: values.extractionStrategy || undefined,
      };
      await onSubmit(updateData);
      return;
    }

    const data: CreateSchemaDto = {
      name: values.name.trim(),
      jsonSchema: parsedJsonSchema,
      requiredFields: fieldsArray,
      projectId: parseInt(values.projectId, 10),
      description: values.description?.trim() || undefined,
      isTemplate: false,
      extractionStrategy: values.extractionStrategy || undefined,
    };
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {!schema && templates.length > 0 && (
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700">
              Start from Template (Optional)
            </label>
            <Select
              value={selectedTemplate || 'none'}
              onValueChange={(value) => handleTemplateSelect(value === 'none' ? '' : value)}
            >
              <SelectTrigger id="template" className="mt-1">
                <SelectValue placeholder="Start with blank schema..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start with blank schema...</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="schema-name">Schema Name *</FormLabel>
              <FormControl>
                <Input {...field} id="schema-name" placeholder="Invoice Schema" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="schema-description">Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  id="schema-description"
                  rows={2}
                  placeholder="Optional description..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <ExtractionStrategySelector
            value={form.watch('extractionStrategy') as ExtractionStrategy | null}
            onChange={(value) =>
              form.setValue('extractionStrategy', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            showCostEstimate={true}
          />
        </div>

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
                      const newJsonSchema = JSON.stringify(newSchema, null, 2);
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

        <FormField
          control={form.control}
          name="requiredFields"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Fields</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder="department.code\ninvoice.po_no\nitems"
                />
              </FormControl>
              <FormDescription>
                Enter required fields using dot notation (one per line). These fields must be present in the extracted data.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!jsonError}>
            {isLoading ? 'Saving...' : schema ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
