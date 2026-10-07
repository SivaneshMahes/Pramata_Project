import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      // Replaced per test file with an in-memory replica set (see setup.ts).
      MONGODB_URI: 'mongodb://placeholder',
      JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-chars',
      BCRYPT_ROUNDS: '4',
      RATE_LIMIT_ENABLED: 'false',
      BUSINESS_TIMEZONE: 'UTC',
    },
  },
});
