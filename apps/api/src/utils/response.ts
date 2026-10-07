import type { Response } from 'express';
import type { ApiSuccess } from '@vrp/shared-types';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}
