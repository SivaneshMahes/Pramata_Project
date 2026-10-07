import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { tokenService } from '../services/token.service.js';

/**
 * The JWT travels in an httpOnly cookie so page scripts (and any XSS) cannot
 * read it. SameSite=Lax plus JSON-only mutating endpoints blocks CSRF; in
 * production the SPA and API share one CloudFront origin.
 */
const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
});

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, { ...baseOptions(), maxAge: tokenService.maxAgeMs() });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, baseOptions());
}

/** Cookie first; a Bearer header is accepted for API clients and Swagger. */
export function readToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[env.COOKIE_NAME];
  if (fromCookie) return fromCookie;
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim() || undefined;
  return undefined;
}
