import { USER_ROLES } from '@vrp/shared-types';
import { z } from 'zod';

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name must be at most 80 characters');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const roleSchema = z.enum(USER_ROLES, 'Choose whether you rent or list vehicles');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: nameSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const completeOnboardingSchema = z.object({
  role: roleSchema,
});
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

export const googleSignInSchema = z.object({
  /** The ID token (JWT) returned by Google Identity Services. */
  credential: z.string().min(20, 'Missing Google credential').max(4096),
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
