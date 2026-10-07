import { describe, expect, it } from 'vitest';
import {
  api,
  book,
  createVehicle,
  ownerAction,
  registerCustomer,
  registerOwner,
} from './helpers.js';
import type { TestUser } from './helpers.js';
import { setBusinessToday, TEST_TODAY } from './setup.js';

async function returnedBooking(
  customer: TestUser,
  owner: TestUser,
  vehicleId: string,
  start = TEST_TODAY,
  end = '2026-10-02',
) {
  const created = await book(customer, vehicleId, start, end);
  const id = created.body.data.id as string;
  await ownerAction(owner, id, 'approve').expect(200);
  await ownerAction(owner, id, 'hand-over').expect(200);
  await ownerAction(owner, id, 'return').expect(200);
  return id;
}

const review = (user: TestUser, body: Record<string, unknown>) =>
  api().post('/api/v1/reviews').set('Cookie', user.cookie).send(body);

describe('reviews', () => {
  it('only allows reviews after the vehicle is returned', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const created = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');

    const res = await review(customer, { booking: created.body.data.id, rating: 5 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REVIEW_NOT_ALLOWED');
  });

  it('creates a review, updates the vehicle rating and blocks duplicates', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const bookingId = await returnedBooking(customer, owner, vehicle.id);

    const created = await review(customer, {
      booking: bookingId,
      vehicle: vehicle.id,
      rating: 4,
      comment: 'Clean and punctual.',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      rating: 4,
      comment: 'Clean and punctual.',
      booking: bookingId,
    });

    const vehicleAfter = await api().get(`/api/v1/vehicles/${vehicle.id}`);
    expect(vehicleAfter.body.data).toMatchObject({ averageRating: 4, reviewCount: 1 });

    const duplicate = await review(customer, { booking: bookingId, rating: 5 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('REVIEW_EXISTS');

    const detail = await api().get(`/api/v1/bookings/${bookingId}`).set('Cookie', customer.cookie);
    expect(detail.body.data.hasReview).toBe(true);
    expect(detail.body.data.review.rating).toBe(4);
  });

  it('averages ratings across rentals', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const first = await returnedBooking(customer, owner, vehicle.id, TEST_TODAY, '2026-10-02');
    setBusinessToday('2026-10-02');
    const second = await returnedBooking(customer, owner, vehicle.id, '2026-10-02', '2026-10-03');

    await review(customer, { booking: first, rating: 5 }).expect(201);
    await review(customer, { booking: second, rating: 4 }).expect(201);
    const res = await api().get(`/api/v1/vehicles/${vehicle.id}`);
    expect(res.body.data).toMatchObject({ averageRating: 4.5, reviewCount: 2 });
  });

  it('rejects reviewing someone else’s booking or a mismatched vehicle', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const stranger = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const otherVehicle = await createVehicle(owner);
    const bookingId = await returnedBooking(customer, owner, vehicle.id);

    await review(stranger, { booking: bookingId, rating: 1 }).expect(404);
    const mismatch = await review(customer, {
      booking: bookingId,
      vehicle: otherVehicle.id,
      rating: 5,
    });
    expect(mismatch.status).toBe(400);
    await review(customer, { booking: bookingId, rating: 6 }).expect(400);
    await review(owner, { booking: bookingId, rating: 5 }).expect(403);
  });

  it('lets only the author edit a review and recalculates the rating', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const stranger = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const bookingId = await returnedBooking(customer, owner, vehicle.id);
    const created = await review(customer, { booking: bookingId, rating: 2, comment: 'Meh' });
    const reviewId = created.body.data.id as string;

    const forbidden = await api()
      .put(`/api/v1/reviews/${reviewId}`)
      .set('Cookie', stranger.cookie)
      .send({ rating: 1, comment: 'hijack' });
    expect(forbidden.status).toBe(403);

    const updated = await api()
      .put(`/api/v1/reviews/${reviewId}`)
      .set('Cookie', customer.cookie)
      .send({ rating: 5, comment: 'Actually great' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ rating: 5, comment: 'Actually great' });

    const listed = await api().get(`/api/v1/vehicles/${vehicle.id}/reviews`);
    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.items[0].customer.name).toBe('Test User');
    const vehicleAfter = await api().get(`/api/v1/vehicles/${vehicle.id}`);
    expect(vehicleAfter.body.data.averageRating).toBe(5);
  });
});
