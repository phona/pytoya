import { z } from 'zod';

export const extractorFormSchema = z.object({
  name: z.string().trim().min(1, 'Extractor name is required'),
  description: z.string().max(500, 'Description is too long').optional(),
  extractorType: z.string().min(1, 'Extractor type is required'),
  isActive: z.boolean().default(true),
  config: z.record(z.string(), z.any()).default({}),
});

export type ExtractorFormValues = z.input<typeof extractorFormSchema>;
