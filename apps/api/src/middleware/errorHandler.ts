import { ErrorCode } from '@vrp/shared-types';
import type { ApiErrorBody } from '@vrp/shared-types';
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { isDuplicateKeyError } from '../utils/mongoErrors.js';

function send(res: Response, status: number, body: Omit<ApiErrorBody, 'success'>) {
  res.status(status).json({ success: false, ...body } satisfies ApiErrorBody);
}

/**
 * Converts every failure into the uniform error envelope. Unexpected errors
 * are logged with full detail server-side and returned as a generic 500 —
 * stack traces and driver messages never reach the client.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) req.log?.error({ err: error }, error.message);
    return send(res, error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // body-parser errors carry an HTTP status and a type.
  const httpError = error as { type?: string; status?: number };
  if (httpError?.type === 'entity.too.large') {
    return send(res, 413, {
      code: ErrorCode.PAYLOAD_TOO_LARGE,
      message: 'Request body is too large.',
    });
  }
  if (httpError?.type === 'entity.parse.failed') {
    return send(res, 400, { code: ErrorCode.VALIDATION_ERROR, message: 'Malformed JSON body.' });
  }

  if (error instanceof mongoose.Error.CastError) {
    return send(res, 400, { code: ErrorCode.VALIDATION_ERROR, message: `Invalid ${error.path}.` });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
    return send(res, 400, { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid data.', details });
  }
  if (isDuplicateKeyError(error)) {
    return send(res, 409, {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'This record already exists.',
    });
  }

  (req.log ?? logger).error({ err: error }, 'Unhandled error');
  return send(res, 500, {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'Something went wrong on our side. Please try again.',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, { code: ErrorCode.NOT_FOUND, message: `No route for ${req.method} ${req.path}.` });
}
