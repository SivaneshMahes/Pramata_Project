import { ErrorCode } from '@vrp/shared-types';
import type { UserRole } from '@vrp/shared-types';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';

/** Must run after authenticate(). Ownership checks happen in the services. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw AppError.unauthenticated();
    if (user.role === null) {
      throw new AppError(
        403,
        ErrorCode.ONBOARDING_REQUIRED,
        'Choose how you will use the platform first.',
      );
    }
    if (!roles.includes(user.role)) throw AppError.forbidden();
    next();
  };
}
