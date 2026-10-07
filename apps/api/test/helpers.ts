import { UserRole, VehicleType } from '@vrp/shared-types';
import type { UserRole as UserRoleType, VehicleDto } from '@vrp/shared-types';
import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);

let sequence = 0;
const unique = () => `${Date.now().toString(36)}${(sequence++).toString(36)}`;

export interface TestUser {
  id: string;
  email: string;
  cookie: string;
}

export async function registerUser(
  role: UserRoleType,
  overrides: Record<string, unknown> = {},
): Promise<TestUser> {
  const email = `user-${unique()}@example.com`;
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ name: 'Test User', email, password: 'Password123', role, ...overrides });
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  return { id: res.body.data.user.id, email, cookie: setCookie[0]!.split(';')[0]! };
}

export const registerOwner = () => registerUser(UserRole.OWNER);
export const registerCustomer = () => registerUser(UserRole.CUSTOMER);

export function vehiclePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Honda City',
    description: 'Comfortable sedan in excellent condition.',
    images: [{ url: 'https://example.com/city.jpg' }],
    type: VehicleType.CAR,
    registrationNumber: `TN${unique().toUpperCase().slice(-8)}`,
    dailyPrice: 1800,
    location: 'Coimbatore',
    isAvailable: true,
    features: ['Automatic', 'AC', 'GPS'],
    ...overrides,
  };
}

export async function createVehicle(
  owner: TestUser,
  overrides: Record<string, unknown> = {},
): Promise<VehicleDto> {
  const res = await api()
    .post('/api/v1/vehicles')
    .set('Cookie', owner.cookie)
    .send(vehiclePayload(overrides));
  if (res.status !== 201)
    throw new Error(`vehicle failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as VehicleDto;
}

export function book(
  customer: TestUser,
  vehicleId: string,
  startDate: string,
  endDate: string,
  extra: Record<string, unknown> = {},
) {
  return api()
    .post('/api/v1/bookings')
    .set('Cookie', customer.cookie)
    .send({ vehicle: vehicleId, startDate, endDate, ...extra });
}

export function ownerAction(
  owner: TestUser,
  bookingId: string,
  action: 'approve' | 'reject' | 'hand-over' | 'return',
) {
  return api().patch(`/api/v1/bookings/${bookingId}/${action}`).set('Cookie', owner.cookie);
}
