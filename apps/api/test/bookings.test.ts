import { describe, expect, it } from 'vitest';
import { BookingModel } from '../src/models/Booking.js';
import {
  api,
  book,
  createVehicle,
  ownerAction,
  registerCustomer,
  registerOwner,
} from './helpers.js';
import { TEST_TODAY } from './setup.js';

async function scenario() {
  const owner = await registerOwner();
  const customer = await registerCustomer();
  const vehicle = await createVehicle(owner, { dailyPrice: 1800 });
  return { owner, customer, vehicle };
}

describe('overlap prevention — assignment acceptance test', () => {
  it('A: 10→15 Oct. B: 12→17 Oct fails. B: 15→20 Oct succeeds (back-to-back).', async () => {
    const { vehicle, customer } = await scenario();
    const other = await registerCustomer();

    const a = await book(customer, vehicle.id, '2026-10-10', '2026-10-15');
    expect(a.status).toBe(201);

    const overlapping = await book(other, vehicle.id, '2026-10-12', '2026-10-17');
    expect(overlapping.status).toBe(409);
    expect(overlapping.body).toEqual({
      success: false,
      code: 'BOOKING_CONFLICT',
      message: 'Vehicle is already booked for the selected dates.',
    });

    const backToBack = await book(other, vehicle.id, '2026-10-15', '2026-10-20');
    expect(backToBack.status).toBe(201);
  });

  it.each([
    ['contained inside', '2026-10-11', '2026-10-13'],
    ['enclosing', '2026-10-08', '2026-10-18'],
    ['overlapping the start', '2026-10-08', '2026-10-11'],
    ['identical', '2026-10-10', '2026-10-15'],
  ])('rejects a range %s an existing booking', async (_label, start, end) => {
    const { vehicle, customer } = await scenario();
    await book(customer, vehicle.id, '2026-10-10', '2026-10-15').expect(201);
    const res = await book(customer, vehicle.id, start, end);
    expect(res.status).toBe(409);
  });

  it('allows a booking that ends exactly when another starts', async () => {
    const { vehicle, customer } = await scenario();
    await book(customer, vehicle.id, '2026-10-10', '2026-10-15').expect(201);
    await book(customer, vehicle.id, '2026-10-05', '2026-10-10').expect(201);
  });

  it('frees dates when a booking is rejected or cancelled', async () => {
    const { vehicle, customer, owner } = await scenario();
    const first = await book(customer, vehicle.id, '2026-10-10', '2026-10-15');
    await ownerAction(owner, first.body.data.id, 'reject').expect(200);
    const second = await book(customer, vehicle.id, '2026-10-10', '2026-10-15');
    expect(second.status).toBe(201);
    await api()
      .patch(`/api/v1/bookings/${second.body.data.id}/cancel`)
      .set('Cookie', customer.cookie)
      .expect(200);
    await book(customer, vehicle.id, '2026-10-11', '2026-10-12').expect(201);
  });

  it('serialises concurrent attempts: exactly one of many simultaneous bookings wins', async () => {
    const { vehicle } = await scenario();
    const customers = await Promise.all(Array.from({ length: 6 }, () => registerCustomer()));

    const results = await Promise.all(
      customers.map((c, i) => book(c, vehicle.id, `2026-10-1${i % 3}`, '2026-10-15')),
    );
    const statuses = results.map((r) => r.status).sort();

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    expect(await BookingModel.countDocuments({ vehicle: vehicle.id })).toBe(1);
  });
});

describe('pricing', () => {
  it('computes totalDays × dailyPrice on the server and ignores client price fields', async () => {
    const { vehicle, customer } = await scenario();
    const res = await book(customer, vehicle.id, '2026-10-10', '2026-10-13', {
      totalAmount: 1,
      dailyPrice: 1,
      totalDays: 99,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      startDate: '2026-10-10',
      endDate: '2026-10-13',
      totalDays: 3,
      dailyPrice: 1800,
      subtotal: 5400,
      discountAmount: 0,
      totalAmount: 5400,
      status: 'PENDING',
    });
  });

  it('keeps the booking-time price after the owner changes the daily rate', async () => {
    const { vehicle, customer, owner } = await scenario();
    const booking = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');

    await api()
      .put(`/api/v1/vehicles/${vehicle.id}`)
      .set('Cookie', owner.cookie)
      .send({ ...vehicle, dailyPrice: 5000 })
      .expect(200);

    const res = await api()
      .get(`/api/v1/bookings/${booking.body.data.id}`)
      .set('Cookie', customer.cookie);
    expect(res.body.data).toMatchObject({ dailyPrice: 1800, totalAmount: 3600 });
  });

  it('quotes availability with the same rules', async () => {
    const { vehicle, customer } = await scenario();
    const free = await api()
      .get(`/api/v1/vehicles/${vehicle.id}/availability`)
      .query({ startDate: '2026-10-10', endDate: '2026-10-13' });
    expect(free.body.data).toMatchObject({
      available: true,
      reason: 'AVAILABLE',
      totalDays: 3,
      totalAmount: 5400,
    });

    await book(customer, vehicle.id, '2026-10-12', '2026-10-14').expect(201);
    const taken = await api()
      .get(`/api/v1/vehicles/${vehicle.id}/availability`)
      .query({ startDate: '2026-10-10', endDate: '2026-10-13' });
    expect(taken.body.data).toMatchObject({ available: false, reason: 'BOOKED' });
  });
});

describe('date validation', () => {
  it.each([
    ['a start date in the past', '2026-09-30', '2026-10-02', 'INVALID_DATES'],
    ['an end date equal to the start', '2026-10-10', '2026-10-10', 'VALIDATION_ERROR'],
    ['an end date before the start', '2026-10-12', '2026-10-10', 'VALIDATION_ERROR'],
    ['an impossible calendar date', '2026-02-30', '2026-03-02', 'VALIDATION_ERROR'],
    ['a rental longer than 90 days', '2026-10-10', '2027-01-20', 'INVALID_DATES'],
    ['a start more than a year ahead', '2027-10-10', '2027-10-12', 'INVALID_DATES'],
  ])('rejects %s', async (_label, start, end, code) => {
    const { vehicle, customer } = await scenario();
    const res = await book(customer, vehicle.id, start, end);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
  });

  it('accepts a booking starting today', async () => {
    const { vehicle, customer } = await scenario();
    await book(customer, vehicle.id, TEST_TODAY, '2026-10-02').expect(201);
  });

  it('rejects bookings on a vehicle marked unavailable', async () => {
    const { vehicle, customer, owner } = await scenario();
    await api()
      .patch(`/api/v1/vehicles/${vehicle.id}/availability`)
      .set('Cookie', owner.cookie)
      .send({ isAvailable: false });
    const res = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('VEHICLE_UNAVAILABLE');
  });

  it('only lets customers book', async () => {
    const { vehicle, owner } = await scenario();
    const res = await book(owner, vehicle.id, '2026-10-10', '2026-10-12');
    expect(res.status).toBe(403);
  });
});

describe('lifecycle and authorization', () => {
  it('walks PENDING → APPROVED → HANDED_OVER → RETURNED', async () => {
    const { vehicle, customer, owner } = await scenario();
    const created = await book(customer, vehicle.id, TEST_TODAY, '2026-10-03');
    const id = created.body.data.id as string;

    expect((await ownerAction(owner, id, 'approve')).body.data.status).toBe('APPROVED');
    expect((await ownerAction(owner, id, 'hand-over')).body.data.status).toBe('HANDED_OVER');
    expect((await ownerAction(owner, id, 'return')).body.data.status).toBe('RETURNED');

    const history = await BookingModel.findById(id).lean();
    expect(history?.statusHistory.map((h) => h.status)).toEqual([
      'PENDING',
      'APPROVED',
      'HANDED_OVER',
      'RETURNED',
    ]);
  });

  it.each(['return', 'hand-over'] as const)('rejects %s on a pending booking', async (action) => {
    const { vehicle, customer, owner } = await scenario();
    const created = await book(customer, vehicle.id, TEST_TODAY, '2026-10-03');
    const res = await ownerAction(owner, created.body.data.id, action);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects any transition out of a terminal state', async () => {
    const { vehicle, customer, owner } = await scenario();
    const created = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
    const id = created.body.data.id as string;
    await ownerAction(owner, id, 'reject').expect(200);

    for (const action of ['approve', 'reject', 'hand-over', 'return'] as const) {
      expect((await ownerAction(owner, id, action)).status).toBe(409);
    }
    const cancel = await api()
      .patch(`/api/v1/bookings/${id}/cancel`)
      .set('Cookie', customer.cookie);
    expect(cancel.status).toBe(409);
  });

  it('does not hand over before the start date', async () => {
    const { vehicle, customer, owner } = await scenario();
    const created = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
    await ownerAction(owner, created.body.data.id, 'approve').expect(200);
    const res = await ownerAction(owner, created.body.data.id, 'hand-over');
    expect(res.status).toBe(409);
  });

  it('lets customers cancel pending and approved bookings before the start date only', async () => {
    const { vehicle, customer, owner } = await scenario();
    const pending = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
    expect(pending.body.data.canCancel).toBe(true);
    const cancelled = await api()
      .patch(`/api/v1/bookings/${pending.body.data.id}/cancel`)
      .set('Cookie', customer.cookie);
    expect(cancelled.body.data.status).toBe('CANCELLED');

    const approved = await book(customer, vehicle.id, '2026-10-20', '2026-10-22');
    await ownerAction(owner, approved.body.data.id, 'approve').expect(200);
    await api()
      .patch(`/api/v1/bookings/${approved.body.data.id}/cancel`)
      .set('Cookie', customer.cookie)
      .expect(200);

    const startsToday = await book(customer, vehicle.id, TEST_TODAY, '2026-10-03');
    expect(startsToday.body.data.canCancel).toBe(false);
    const res = await api()
      .patch(`/api/v1/bookings/${startsToday.body.data.id}/cancel`)
      .set('Cookie', customer.cookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_NOT_CANCELLABLE');
  });

  it('hides bookings from anyone who is not the customer or the owner', async () => {
    const { vehicle, customer } = await scenario();
    const otherCustomer = await registerCustomer();
    const otherOwner = await registerOwner();
    const created = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
    const id = created.body.data.id as string;

    await api().get(`/api/v1/bookings/${id}`).set('Cookie', otherCustomer.cookie).expect(404);
    await api().get(`/api/v1/bookings/${id}`).set('Cookie', otherOwner.cookie).expect(404);
    await api()
      .patch(`/api/v1/bookings/${id}/cancel`)
      .set('Cookie', otherCustomer.cookie)
      .expect(404);
    await ownerAction(otherOwner, id, 'approve').expect(404);
    // And a customer cannot use owner actions at all.
    await ownerAction(customer, id, 'approve').expect(403);
  });

  it('lists customer bookings by scope and owner bookings by status', async () => {
    const { vehicle, customer, owner } = await scenario();
    const a = await book(customer, vehicle.id, TEST_TODAY, '2026-10-03');
    await book(customer, vehicle.id, '2026-10-10', '2026-10-12');
    await ownerAction(owner, a.body.data.id, 'approve');
    await ownerAction(owner, a.body.data.id, 'hand-over');

    const upcoming = await api()
      .get('/api/v1/bookings/my')
      .query({ scope: 'upcoming' })
      .set('Cookie', customer.cookie);
    const active = await api()
      .get('/api/v1/bookings/my')
      .query({ scope: 'active' })
      .set('Cookie', customer.cookie);
    expect(upcoming.body.data.items).toHaveLength(1);
    expect(active.body.data.items).toHaveLength(1);

    const pendingForOwner = await api()
      .get('/api/v1/owner/bookings')
      .query({ status: 'PENDING' })
      .set('Cookie', owner.cookie);
    expect(pendingForOwner.body.data.items).toHaveLength(1);
    expect(pendingForOwner.body.data.items[0].customer.email).toBe(customer.email);

    const summary = await api().get('/api/v1/bookings/my/summary').set('Cookie', customer.cookie);
    expect(summary.body.data).toMatchObject({
      upcoming: 1,
      active: 1,
      completed: 0,
      totalSpent: 3600,
    });
  });

  it('reports owner dashboard figures', async () => {
    const { vehicle, customer, owner } = await scenario();
    const a = await book(customer, vehicle.id, TEST_TODAY, '2026-10-03');
    await ownerAction(owner, a.body.data.id, 'approve');
    await ownerAction(owner, a.body.data.id, 'hand-over');
    await ownerAction(owner, a.body.data.id, 'return');
    await book(customer, vehicle.id, '2026-10-10', '2026-10-12');

    const res = await api().get('/api/v1/owner/dashboard').set('Cookie', owner.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalVehicles: 1,
      activeRentals: 0,
      pendingRequests: 1,
      revenue: 3600,
    });
    expect(res.body.data.monthlyRevenue).toHaveLength(6);
    expect(res.body.data.monthlyRevenue.at(-1)).toEqual({ month: '2026-10', revenue: 3600 });
  });
});
