import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject, vi } from 'vitest';
import { connectDatabase } from '../src/config/database.js';

/** Business "today" in tests is pinned so date rules are deterministic. */
export const TEST_TODAY = '2026-10-01';

/**
 * Every date rule reads "today" from businessToday(), so tests pin that one
 * function rather than faking the global clock (which would also skew the
 * database driver's timers and JWT expiry).
 */
const clock = vi.hoisted(() => ({ today: '2026-10-01' }));
vi.mock('../src/utils/clock.js', () => ({ businessToday: () => clock.today }));

export function setBusinessToday(date: string): void {
  clock.today = date;
}

beforeAll(async () => {
  // Each test file gets its own database so files can run in parallel.
  const uri = new URL(inject('mongoUri'));
  uri.pathname = `/vrp_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  await connectDatabase(uri.toString());
  await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
});

beforeEach(async () => {
  setBusinessToday(TEST_TODAY);
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
