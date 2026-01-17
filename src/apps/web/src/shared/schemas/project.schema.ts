import { z } from 'zod';

/** Zod schema for project create/edit form values. */
export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  ocrModelId: z.string().optional(),
  llmModelId: z.string().optional(),
});

/** Form values inferred from projectSchema. */
export type ProjectFormValues = z.infer<typeof projectSchema>;
