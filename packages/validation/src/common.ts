import { PAGINATION_LIMITS } from '@vrp/shared-types';
import { z } from 'zod';
import { isValidDateOnly } from './dates.js';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

export const dateOnlySchema = z
  .string()
  .refine(isValidDateOnly, 'Use a valid date in YYYY-MM-DD format');

/** Query strings arrive as strings; treat empty values as "not provided". */
export const emptyToUndefined = (value: unknown): unknown =>
  value === '' || value === null ? undefined : value;

export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

export const paginationQuerySchema = z.object({
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(10_000).default(1)),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION_LIMITS.MAX_LIMIT)
      .default(PAGINATION_LIMITS.DEFAULT_LIMIT),
  ),
});

export const idParamSchema = z.object({ id: objectIdSchema });
export type IdParam = z.infer<typeof idParamSchema>;
