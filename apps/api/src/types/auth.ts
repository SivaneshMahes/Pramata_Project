import type { UserRole } from '@vrp/shared-types';

/** Identity resolved by authenticate() from a verified JWT + a live user lookup. */
export interface AuthUser {
  id: string;
  role: UserRole | null;
  name: string;
  email: string;
}

/** The only claims we put in a token: who, and in which role. */
export interface TokenClaims {
  sub: string;
  role: UserRole | null;
}
