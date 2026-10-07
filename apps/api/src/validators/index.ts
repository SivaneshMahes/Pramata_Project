import { ErrorCode } from '@vrp/shared-types';
import type { z } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Parses untrusted input with a shared schema. Controllers call this so the
 * parsed value is fully typed; failures become a uniform 400 response.
 */
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw AppError.badRequest(
      details[0]?.message ?? 'Invalid request.',
      ErrorCode.VALIDATION_ERROR,
      details,
    );
  }
  return result.data;
}

export * from '@vrp/validation';
