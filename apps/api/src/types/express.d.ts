import type { AuthUser } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by authenticate(); never read identity from the request body. */
      user?: AuthUser;
    }
  }
}

export {};
