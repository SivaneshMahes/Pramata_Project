import jwt from 'jsonwebtoken';
import { USER_ROLES } from '@vrp/shared-types';
import { env } from '../config/env.js';
import type { TokenClaims } from '../types/auth.js';
import { AppError } from '../utils/AppError.js';

const ALGORITHM = 'HS256';

export const tokenService = {
  sign(claims: TokenClaims): string {
    return jwt.sign({ role: claims.role }, env.JWT_SECRET, {
      algorithm: ALGORITHM,
      subject: claims.sub,
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
  },

  verify(token: string): TokenClaims {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: [ALGORITHM],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });
      if (typeof payload === 'string' || !payload.sub) throw new Error('Malformed token');
      const role = payload.role as unknown;
      if (role !== null && !USER_ROLES.includes(role as never)) throw new Error('Malformed role');
      return { sub: payload.sub, role: role as TokenClaims['role'] };
    } catch {
      throw AppError.unauthenticated('Your session has expired. Please sign in again.');
    }
  },

  /** Cookie lifetime mirrors the token lifetime. */
  maxAgeMs(): number {
    return env.JWT_EXPIRES_IN_SECONDS * 1000;
  },
};
