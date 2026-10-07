import { UserRole } from '@vrp/shared-types';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { api, registerUser } from './helpers.js';

const credentials = {
  name: 'Priya Sharma',
  email: 'priya@example.com',
  password: 'Password123',
  role: UserRole.CUSTOMER,
};

describe('POST /api/v1/auth/register', () => {
  it('creates an account, sets an httpOnly session cookie and never returns the hash', async () => {
    const res = await api().post('/api/v1/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ email: 'priya@example.com', role: 'CUSTOMER' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await api().post('/api/v1/auth/register').send(credentials).expect(201);
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ ...credentials, email: 'PRIYA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, code: 'EMAIL_TAKEN' });
  });

  it.each([
    [{ email: 'not-an-email' }, 'email'],
    [{ password: 'short1' }, 'password'],
    [{ password: 'nonumbershere' }, 'password'],
    [{ role: 'ADMIN' }, 'role'],
    [{ name: 'A' }, 'name'],
  ])('rejects invalid input %j', async (override, field) => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ ...credentials, ...override });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d: { path: string }) => d.path)).toContain(field);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with valid credentials', async () => {
    await api().post('/api/v1/auth/register').send(credentials).expect(201);
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    await api().post('/api/v1/auth/register').send(credentials).expect(201);
    const wrongPassword = await api()
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'Wrong12345' });
    const unknownEmail = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123' });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      });
    }
  });
});

describe('JWT session', () => {
  it('resolves the current user from the cookie', async () => {
    const user = await registerUser(UserRole.OWNER);
    const res = await api().get('/api/v1/auth/me').set('Cookie', user.cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, role: 'OWNER' });
  });

  it('accepts a Bearer token for API clients', async () => {
    const user = await registerUser(UserRole.CUSTOMER);
    const token = user.cookie.split('=')[1]!;
    const res = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('carries only identity claims', async () => {
    const user = await registerUser(UserRole.CUSTOMER);
    const payload = jwt.decode(user.cookie.split('=')[1]!) as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'role', 'sub']);
  });

  it('rejects a missing, tampered or foreign-signed token', async () => {
    const user = await registerUser(UserRole.CUSTOMER);
    const token = user.cookie.split('=')[1]!;
    const forged = jwt.sign({ role: 'OWNER' }, 'another-secret-that-is-long-enough-123456', {
      subject: user.id,
      issuer: 'vehicle-rental-api',
      audience: 'vehicle-rental-web',
    });

    await api().get('/api/v1/auth/me').expect(401);
    await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}x`).expect(401);
    await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  it('clears the cookie on logout', async () => {
    const res = await api().post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/vrp_session=;/);
  });
});

describe('platform', () => {
  it('serves health checks', async () => {
    await api().get('/health').expect(200, { status: 'ok' });
    const res = await api().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns the error envelope for unknown routes and malformed JSON', async () => {
    const missing = await api().get('/api/v1/nope');
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ success: false, code: 'NOT_FOUND' });

    const malformed = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe('VALIDATION_ERROR');
  });

  it('sets security headers', async () => {
    const res = await api().get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('API documentation', () => {
  it('serves the OpenAPI document and Swagger UI', async () => {
    const spec = await api().get('/api/v1/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
    expect(Object.keys(spec.body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/vehicles',
        '/bookings',
        '/reviews',
        '/owner/bookings',
      ]),
    );
    const ui = await api().get('/api/v1/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });
});
