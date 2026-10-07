import { describe, expect, it } from 'vitest';
import { CouponModel } from '../src/models/Coupon.js';
import {
  api,
  book,
  createVehicle,
  ownerAction,
  registerCustomer,
  registerOwner,
} from './helpers.js';
import { TEST_TODAY } from './setup.js';

describe('wishlist', () => {
  it('saves, lists and removes vehicles idempotently, for customers only', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);

    await api()
      .put(`/api/v1/users/me/wishlist/${vehicle.id}`)
      .set('Cookie', customer.cookie)
      .expect(200);
    await api()
      .put(`/api/v1/users/me/wishlist/${vehicle.id}`)
      .set('Cookie', customer.cookie)
      .expect(200);

    const ids = await api().get('/api/v1/users/me/wishlist/ids').set('Cookie', customer.cookie);
    expect(ids.body.data.vehicleIds).toEqual([vehicle.id]);

    const list = await api().get('/api/v1/users/me/wishlist').set('Cookie', customer.cookie);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].vehicle.name).toBe(vehicle.name);

    await api()
      .delete(`/api/v1/users/me/wishlist/${vehicle.id}`)
      .set('Cookie', customer.cookie)
      .expect(200);
    const after = await api().get('/api/v1/users/me/wishlist/ids').set('Cookie', customer.cookie);
    expect(after.body.data.vehicleIds).toEqual([]);

    await api()
      .put(`/api/v1/users/me/wishlist/${vehicle.id}`)
      .set('Cookie', owner.cookie)
      .expect(403);
    await api()
      .put('/api/v1/users/me/wishlist/0123456789abcdef01234567')
      .set('Cookie', customer.cookie)
      .expect(404);
  });
});

describe('calendar', () => {
  it('returns blocking ranges from the shared availability logic', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);
    await book(customer, vehicle.id, '2026-10-10', '2026-10-15').expect(201);
    const cancelled = await book(customer, vehicle.id, '2026-10-20', '2026-10-22');
    await api()
      .patch(`/api/v1/bookings/${cancelled.body.data.id}/cancel`)
      .set('Cookie', customer.cookie)
      .expect(200);

    const res = await api()
      .get(`/api/v1/vehicles/${vehicle.id}/calendar`)
      .query({ from: '2026-10-01', to: '2026-11-01' });
    expect(res.body.data.bookedRanges).toEqual([
      { startDate: '2026-10-10', endDate: '2026-10-15' },
    ]);
  });
});

describe('uploads', () => {
  it('requires the owner role and validates the declared file', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    await api()
      .post('/api/v1/uploads/vehicle-images')
      .set('Cookie', customer.cookie)
      .send({ contentType: 'image/png', contentLength: 100 })
      .expect(403);
    await api()
      .post('/api/v1/uploads/vehicle-images')
      .set('Cookie', owner.cookie)
      .send({ contentType: 'image/gif', contentLength: 100 })
      .expect(400);
    await api()
      .post('/api/v1/uploads/vehicle-images')
      .set('Cookie', owner.cookie)
      .send({ contentType: 'image/png', contentLength: 50 * 1024 * 1024 })
      .expect(400);
    // S3 isn't configured in tests, so a valid request reports the service as unavailable.
    const res = await api()
      .post('/api/v1/uploads/vehicle-images')
      .set('Cookie', owner.cookie)
      .send({ contentType: 'image/png', contentLength: 1000 });
    expect(res.status).toBe(503);
  });

  it('rejects vehicle images that claim another owner’s S3 key', async () => {
    const owner = await registerOwner();
    const res = await api()
      .post('/api/v1/vehicles')
      .set('Cookie', owner.cookie)
      .send({
        name: 'Honda City',
        description: 'Comfortable sedan in excellent condition.',
        type: 'CAR',
        registrationNumber: 'TN01ZZ0001',
        dailyPrice: 1000,
        location: 'Chennai',
        images: [
          {
            url: 'https://cdn.example.com/vehicles/someone-else/x.jpg',
            key: 'vehicles/someone-else/x.jpg',
          },
        ],
      });
    expect(res.status).toBe(400);
  });
});

describe('invoices', () => {
  it('is available to both parties once approved, and to nobody else', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const stranger = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const booking = await book(customer, vehicle.id, TEST_TODAY, '2026-10-03');
    const id = booking.body.data.id as string;

    await api().get(`/api/v1/bookings/${id}/invoice`).set('Cookie', customer.cookie).expect(409);
    await ownerAction(owner, id, 'approve').expect(200);

    for (const user of [customer, owner]) {
      const res = await api()
        .get(`/api/v1/bookings/${id}/invoice`)
        .set('Cookie', user.cookie)
        .buffer(true);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/INV-\d{6}-[A-F0-9]{8}\.pdf/);
    }
    await api().get(`/api/v1/bookings/${id}/invoice`).set('Cookie', stranger.cookie).expect(404);
  });
});

describe('coupons', () => {
  it('applies a valid coupon on the server and enforces the usage limit', async () => {
    await CouponModel.create({
      code: 'ONCE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscount: 1000,
      minimumAmount: 0,
      expiresAt: new Date('2027-01-01'),
      usageLimit: 1,
    });
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner, { dailyPrice: 1800 });

    const first = await book(customer, vehicle.id, '2026-10-10', '2026-10-13', {
      couponCode: 'once20',
    });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      subtotal: 5400,
      discountAmount: 1000,
      totalAmount: 4400,
      couponCode: 'ONCE20',
    });

    const second = await book(customer, vehicle.id, '2026-10-20', '2026-10-21', {
      couponCode: 'ONCE20',
    });
    expect(second.status).toBe(400);
    expect(second.body.code).toBe('COUPON_INVALID');

    const unknown = await book(customer, vehicle.id, '2026-10-20', '2026-10-21', {
      couponCode: 'NOPE99',
    });
    expect(unknown.body.code).toBe('COUPON_INVALID');
  });
});
