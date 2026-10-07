import pino from 'pino';
import { env } from './env.js';

/**
 * Structured JSON logs (CloudWatch-friendly). Sensitive fields are redacted at
 * the logger so a careless `logger.info({ body })` can never leak credentials.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'vehicle-rental-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.idToken',
      '*.credential',
      '*.secret',
      '*.MONGODB_URI',
      '*.JWT_SECRET',
    ],
    censor: '[REDACTED]',
  },
  ...(env.LOG_FORMAT === 'pretty'
    ? { transport: { target: 'pino-pretty', options: { singleLine: true, colorize: true } } }
    : {}),
});
