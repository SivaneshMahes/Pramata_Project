import { OAuth2Client } from 'google-auth-library';
import { ErrorCode } from '@vrp/shared-types';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

const client = new OAuth2Client();

/** Verifies a Google ID token's signature, issuer, expiry and audience. */
export const googleVerifier = {
  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID);
  },

  async verify(credential: string): Promise<GoogleIdentity> {
    if (!this.isConfigured()) {
      throw new AppError(503, ErrorCode.SERVICE_UNAVAILABLE, 'Google sign-in isn’t enabled here.');
    }
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error('Incomplete Google profile');
      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === true,
        name: payload.name?.trim() || payload.email.split('@')[0]!,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.unauthenticated('Google sign-in failed. Please try again.');
    }
  },
};
