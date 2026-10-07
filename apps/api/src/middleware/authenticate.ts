import type { NextFunction, Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository.js';
import { tokenService } from '../services/token.service.js';
import { AppError } from '../utils/AppError.js';
import { readToken } from '../utils/authCookie.js';

/**
 * Verifies the JWT, then confirms the user still exists and takes the role
 * from the database — so a deleted account or changed role takes effect
 * immediately rather than when the token expires.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) throw AppError.unauthenticated();

  const claims = tokenService.verify(token);
  const user = await userRepository.findById(claims.sub);
  if (!user) throw AppError.unauthenticated();

  req.user = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  next();
}

/** Narrowing helper for controllers behind authenticate(). */
export function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}
