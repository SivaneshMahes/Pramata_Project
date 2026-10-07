import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const csv = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

/**
 * All configuration comes from the environment. Locally that is `.env`; on ECS
 * plain settings come from the task definition and secrets (MONGODB_URI,
 * JWT_SECRET, OAuth credentials) are injected from AWS Secrets Manager.
 * The process refuses to start with an invalid configuration.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** JSON for CloudWatch; 'pretty' needs the pino-pretty dev dependency. */
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
  MONGODB_AUTO_INDEX: booleanFromString.default(true),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** Session lifetime in seconds (default 1 day). Also the cookie max-age. */
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(30 * 86_400)
    .default(86_400),
  JWT_ISSUER: z.string().default('vehicle-rental-api'),
  JWT_AUDIENCE: z.string().default('vehicle-rental-web'),
  COOKIE_NAME: z.string().default('vrp_session'),
  COOKIE_SECURE: booleanFromString.default(false),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CORS_ORIGINS: csv.default([]),
  /** Number of proxy hops to trust for client IPs (CloudFront + ALB = 2). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  BODY_LIMIT: z.string().default('100kb'),

  BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),

  RATE_LIMIT_ENABLED: booleanFromString.default(true),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  /** Google sign-in (optional). The client ID is public; no secret is needed for ID-token verification. */
  GOOGLE_CLIENT_ID: z.string().default(''),

  /** Vehicle photo storage. Leave S3_BUCKET empty to disable uploads. */
  S3_BUCKET: z.string().default(''),
  S3_REGION: z.string().default('ap-south-1'),
  /** Public base URL objects are served from (CloudFront in AWS). */
  S3_PUBLIC_BASE_URL: z.string().default(''),
  /** Only for S3-compatible local storage (the docker-compose `storage` service). */
  S3_ENDPOINT: z.string().optional(),

  /** Interactive API reference at /api/v1/docs. */
  ENABLE_API_DOCS: booleanFromString.default(true),

  ENABLE_JOBS: booleanFromString.default(false),
  JOB_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Logger is not available yet (it depends on env); stderr is the right sink.
    process.stderr.write(`Invalid environment configuration:\n${problems}\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
