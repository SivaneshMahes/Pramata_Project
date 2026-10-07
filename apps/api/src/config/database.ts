import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  const connection = await mongoose.connect(uri, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: 10_000,
    autoIndex: env.MONGODB_AUTO_INDEX,
    // Booking writes rely on majority-acknowledged transactions.
    writeConcern: { w: 'majority' },
    retryWrites: true,
  });
  logger.info({ db: connection.connection.name }, 'MongoDB connected');
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
