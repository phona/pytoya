import { z } from 'zod';

/** Zod schema for login form values. */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Zod schema for register form values. */
export const registerSchema = z
  .object({
    username: z.string().trim().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Form values inferred from loginSchema. */
export type LoginFormValues = z.infer<typeof loginSchema>;
/** Form values inferred from registerSchema. */
export type RegisterFormValues = z.infer<typeof registerSchema>;
