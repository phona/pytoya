import { z } from 'zod';

/** Zod schema for group create/edit form values. */
export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(100, 'Group name is too long'),
});

/** Form values inferred from groupSchema. */
export type GroupFormValues = z.infer<typeof groupSchema>;




