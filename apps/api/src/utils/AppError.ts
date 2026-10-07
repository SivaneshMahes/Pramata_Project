import { ErrorCode } from '@vrp/shared-types';
import type { ApiFieldError } from '@vrp/shared-types';

/** An expected, client-facing failure. Anything else is treated as a 500. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ApiFieldError[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(
    message: string,
    code: ErrorCode = ErrorCode.VALIDATION_ERROR,
    details?: ApiFieldError[],
  ) {
    return new AppError(400, code, message, details);
  }

  static unauthenticated(message = 'Please sign in to continue.') {
    return new AppError(401, ErrorCode.UNAUTHENTICATED, message);
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new AppError(403, ErrorCode.FORBIDDEN, message);
  }

  static notFound(resource = 'Resource') {
    return new AppError(404, ErrorCode.NOT_FOUND, `${resource} not found.`);
  }

  static conflict(code: ErrorCode, message: string) {
    return new AppError(409, code, message);
  }
}
