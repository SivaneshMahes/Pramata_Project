import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';

/**
 * Runs `work` in a MongoDB transaction. The driver's withTransaction retries
 * the whole callback on transient errors such as write conflicts, which is
 * how concurrent bookings for one vehicle get serialised.
 */
export async function runInTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      },
    );
    return result as T;
  } finally {
    await session.endSession();
  }
}
