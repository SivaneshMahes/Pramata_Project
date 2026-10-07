import { createAdapter } from '@socket.io/mongo-adapter';
import type { Server as HttpServer } from 'node:http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { userRepository } from '../repositories/user.repository.js';
import { bookingEvents } from '../services/bookingEvents.js';
import { tokenService } from '../services/token.service.js';
import { buildNotification, userRoom } from './notifications.js';

export const SOCKET_PATH = '/api/v1/socket.io';
const ADAPTER_COLLECTION = 'socket_io_adapter_events';

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** Capped collection: old adapter messages fall off automatically. */
async function adapterCollection() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  try {
    await db.createCollection(ADAPTER_COLLECTION, { capped: true, size: 1_000_000 });
  } catch (error) {
    if ((error as { codeName?: string }).codeName !== 'NamespaceExists') throw error;
  }
  return db.collection(ADAPTER_COLLECTION);
}

/**
 * Real-time booking notifications.
 *
 * Scaling: every ECS task runs its own Socket.IO server; the MongoDB adapter
 * relays room broadcasts between tasks (via a change stream on a capped
 * collection), so an event raised on task A reaches a user connected to task
 * B — with no Redis and no in-memory coupling. WebSocket-only transport means
 * the ALB needs no sticky sessions.
 */
export async function attachRealtime(
  server: HttpServer,
): Promise<{ io: Server; close: () => Promise<void> }> {
  const io = new Server(server, {
    path: SOCKET_PATH,
    transports: ['websocket'],
    serveClient: false,
    cors: { origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false, credentials: true },
  });
  io.adapter(createAdapter(await adapterCollection()));

  // Same identity rules as HTTP: verified JWT from the session cookie (or a
  // token in the handshake auth), then a live user lookup.
  io.use(async (socket, next) => {
    try {
      const token =
        readCookie(socket.handshake.headers.cookie, env.COOKIE_NAME) ??
        (typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : undefined);
      if (!token) return next(new Error('UNAUTHENTICATED'));
      const claims = tokenService.verify(token);
      const user = await userRepository.findById(claims.sub);
      if (!user) return next(new Error('UNAUTHENTICATED'));
      socket.data.userId = user._id.toString();
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    void socket.join(userRoom(socket.data.userId as string));
  });

  const unsubscribe = bookingEvents.subscribe((type, booking) => {
    const { recipientId, event } = buildNotification(type, booking);
    io.to(userRoom(recipientId)).emit('notification', event);
  });

  logger.info({ path: SOCKET_PATH }, 'Realtime notifications enabled');
  return {
    io,
    close: async () => {
      unsubscribe();
      await io.close();
    },
  };
}
