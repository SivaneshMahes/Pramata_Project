import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attachRealtime, SOCKET_PATH } from '../src/realtime/socketServer.js';
import {
  app,
  book,
  createVehicle,
  ownerAction,
  registerCustomer,
  registerOwner,
} from './helpers.js';
import type { TestUser } from './helpers.js';

const server = createServer(app);
let realtime: Awaited<ReturnType<typeof attachRealtime>>;
let baseUrl = '';

beforeAll(async () => {
  realtime = await attachRealtime(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await realtime.close();
  await new Promise((resolve) => server.close(resolve));
});

function socketFor(user?: TestUser): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(baseUrl, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      extraHeaders: user ? { Cookie: user.cookie } : {},
      reconnection: false,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

describe('real-time notifications', () => {
  it('rejects unauthenticated sockets', async () => {
    await expect(socketFor()).rejects.toThrow('UNAUTHENTICATED');
  });

  it('notifies the owner of a new request and the customer of approval', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const [ownerSocket, customerSocket] = await Promise.all([
      socketFor(owner),
      socketFor(customer),
    ]);

    try {
      const ownerHears = new Promise((resolve) => ownerSocket.once('notification', resolve));
      const created = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
      expect(await ownerHears).toMatchObject({
        type: 'booking.created',
        bookingId: created.body.data.id,
      });

      const customerHears = new Promise((resolve) => customerSocket.once('notification', resolve));
      await ownerAction(owner, created.body.data.id, 'approve').expect(200);
      expect(await customerHears).toMatchObject({
        type: 'booking.approved',
        status: 'APPROVED',
        vehicleName: vehicle.name,
      });
    } finally {
      ownerSocket.close();
      customerSocket.close();
    }
  });
});
