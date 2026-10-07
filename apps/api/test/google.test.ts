import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleVerifier } from '../src/services/google.service.js';
import { api, registerUser, vehiclePayload } from './helpers.js';

const CREDENTIAL = 'header.payload.signature-from-google-identity-services';
const identity = (overrides: Partial<Awaited<ReturnType<typeof googleVerifier.verify>>> = {}) => ({
  googleId: 'google-sub-123',
  email: 'g.user@example.com',
  emailVerified: true,
  name: 'Gita User',
  ...overrides,
});

const cookieOf = (res: { headers: Record<string, unknown> }) =>
  (res.headers['set-cookie'] as string[])[0]!.split(';')[0]!;

afterEach(() => vi.restoreAllMocks());

describe('Google sign-in', () => {
  it('creates a role-less account that is blocked until onboarding', async () => {
    vi.spyOn(googleVerifier, 'verify').mockResolvedValue(identity());

    const res = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      isNewUser: true,
      user: { role: null, authProvider: 'google' },
    });
    const cookie = cookieOf(res);

    // OAuth must not bypass authorization: no role, no role-gated access.
    const blocked = await api()
      .post('/api/v1/vehicles')
      .set('Cookie', cookie)
      .send(vehiclePayload());
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('ONBOARDING_REQUIRED');

    const onboarded = await api()
      .post('/api/v1/auth/onboarding')
      .set('Cookie', cookie)
      .send({ role: 'OWNER' });
    expect(onboarded.body.data.user.role).toBe('OWNER');
    await api()
      .post('/api/v1/vehicles')
      .set('Cookie', cookieOf(onboarded))
      .send(vehiclePayload())
      .expect(201);

    // The role is chosen once; it can't be switched later through onboarding.
    await api()
      .post('/api/v1/auth/onboarding')
      .set('Cookie', cookieOf(onboarded))
      .send({ role: 'CUSTOMER' })
      .expect(409);
  });

  it('links to an existing account with the same verified email', async () => {
    const existing = await registerUser('CUSTOMER');
    vi.spyOn(googleVerifier, 'verify').mockResolvedValue(identity({ email: existing.email }));

    const res = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL });
    expect(res.body.data).toMatchObject({
      isNewUser: false,
      user: { id: existing.id, role: 'CUSTOMER' },
    });
  });

  it('refuses unverified Google emails and invalid tokens', async () => {
    vi.spyOn(googleVerifier, 'verify').mockResolvedValueOnce(identity({ emailVerified: false }));
    await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(401);

    vi.restoreAllMocks();
    // Not configured in tests → the real verifier reports the feature as unavailable.
    await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(503);
  });
});
