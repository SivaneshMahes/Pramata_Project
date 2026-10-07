import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { startScheduledJobs } from './jobs/rejectStalePendingBookings.js';
import { attachRealtime } from './realtime/socketServer.js';

async function main() {
  await connectDatabase();

  const server = createServer(createApp());
  // ALB idle timeout is 60s; keep-alive must outlive it to avoid 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  const realtime = await attachRealtime(server);

  const stopJobs = env.ENABLE_JOBS ? startScheduledJobs(env.JOB_INTERVAL_MS) : () => undefined;

  server.listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));

  // ECS sends SIGTERM before stopping a task: finish in-flight requests first.
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    stopJobs();
    void realtime.close();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 25_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start API');
  process.exit(1);
});
