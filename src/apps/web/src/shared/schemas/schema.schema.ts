import { z } from 'zod';
import { ExtractionStrategy } from '@/api/schemas';

/** Validates and parses the JSON schema text input. */
const jsonStringSchema = z
  .string()
  .trim()
  .min(1, 'JSON Schema is required')
  .refine((value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON');

/** Zod schema for schema create/edit form values. */
export const schemaFormSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  jsonSchema: jsonStringSchema,
  extractionStrategy: z.nativeEnum(ExtractionStrategy).nullable().optional(),
});

/** Form values inferred from schemaFormSchema. */
export type SchemaFormValues = z.infer<typeof schemaFormSchema>;




