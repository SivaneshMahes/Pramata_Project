import { dateOnlyToUtc } from '@vrp/validation';
import { logger } from '../config/logger.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { businessToday } from '../utils/clock.js';

/**
 * A pending request whose start date has passed can no longer be honoured, so
 * it is rejected and its dates released. The update is a single idempotent
 * updateMany, so it is safe for several ECS tasks to run it concurrently.
 */
export async function rejectStalePendingBookings(): Promise<number> {
  const count = await bookingRepository.rejectStalePending(dateOnlyToUtc(businessToday()));
  if (count > 0)
    logger.info({ job: 'rejectStalePendingBookings', count }, 'Expired pending bookings');
  return count;
}

export function startScheduledJobs(intervalMs: number): () => void {
  const run = () => {
    rejectStalePendingBookings().catch((error: unknown) =>
      logger.error({ err: error, job: 'rejectStalePendingBookings' }, 'Scheduled job failed'),
    );
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
