import { describe, expect, it } from 'vitest';
import {
  api,
  book,
  createVehicle,
  registerCustomer,
  registerOwner,
  vehiclePayload,
} from './helpers.js';

describe('vehicle management', () => {
  it('lets an owner create a vehicle with a normalised registration number', async () => {
    const owner = await registerOwner();
    const vehicle = await createVehicle(owner, { registrationNumber: 'tn 37 ab-1234' });

    expect(vehicle.registrationNumber).toBe('TN37AB1234');
    expect(vehicle.owner.id).toBe(owner.id);
    expect(vehicle).toMatchObject({ averageRating: 0, reviewCount: 0, isAvailable: true });
  });

  it('requires authentication and the OWNER role', async () => {
    const customer = await registerCustomer();
    await api().post('/api/v1/vehicles').send(vehiclePayload()).expect(401);
    const res = await api()
      .post('/api/v1/vehicles')
      .set('Cookie', customer.cookie)
      .send(vehiclePayload());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('validates the payload', async () => {
    const owner = await registerOwner();
    const res = await api()
      .post('/api/v1/vehicles')
      .set('Cookie', owner.cookie)
      .send(vehiclePayload({ dailyPrice: -5, type: 'TRUCK' }));
    expect(res.status).toBe(400);
    const paths = res.body.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['dailyPrice', 'type']));
  });

  it('rejects a duplicate registration number', async () => {
    const owner = await registerOwner();
    await createVehicle(owner, { registrationNumber: 'KA01AA0001' });
    const res = await api()
      .post('/api/v1/vehicles')
      .set('Cookie', owner.cookie)
      .send(vehiclePayload({ registrationNumber: 'ka-01-aa-0001' }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REGISTRATION_TAKEN');
  });

  it('prevents one owner from editing, disabling or deleting another owner’s vehicle', async () => {
    const ownerA = await registerOwner();
    const ownerB = await registerOwner();
    const vehicle = await createVehicle(ownerA);

    const edit = await api()
      .put(`/api/v1/vehicles/${vehicle.id}`)
      .set('Cookie', ownerB.cookie)
      .send(vehiclePayload({ registrationNumber: vehicle.registrationNumber, dailyPrice: 1 }));
    const disable = await api()
      .patch(`/api/v1/vehicles/${vehicle.id}/availability`)
      .set('Cookie', ownerB.cookie)
      .send({ isAvailable: false });
    const remove = await api()
      .delete(`/api/v1/vehicles/${vehicle.id}`)
      .set('Cookie', ownerB.cookie);

    expect([edit.status, disable.status, remove.status]).toEqual([403, 403, 403]);
    const unchanged = await api().get(`/api/v1/vehicles/${vehicle.id}`);
    expect(unchanged.body.data.dailyPrice).toBe(1800);
  });

  it('lets the owner edit and toggle availability, and lists only their vehicles', async () => {
    const owner = await registerOwner();
    const other = await registerOwner();
    const vehicle = await createVehicle(owner);
    await createVehicle(other);

    const edit = await api()
      .put(`/api/v1/vehicles/${vehicle.id}`)
      .set('Cookie', owner.cookie)
      .send(
        vehiclePayload({
          registrationNumber: vehicle.registrationNumber,
          name: 'Honda City ZX',
          dailyPrice: 2000,
        }),
      );
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({ name: 'Honda City ZX', dailyPrice: 2000 });

    const toggle = await api()
      .patch(`/api/v1/vehicles/${vehicle.id}/availability`)
      .set('Cookie', owner.cookie)
      .send({ isAvailable: false });
    expect(toggle.body.data.isAvailable).toBe(false);

    const mine = await api().get('/api/v1/vehicles/my').set('Cookie', owner.cookie);
    expect(mine.body.data.items).toHaveLength(1);
    expect(mine.body.data.items[0].id).toBe(vehicle.id);
  });

  it('blocks deletion while bookings are active, and allows it once they are resolved', async () => {
    const owner = await registerOwner();
    const customer = await registerCustomer();
    const vehicle = await createVehicle(owner);
    const booking = await book(customer, vehicle.id, '2026-10-10', '2026-10-12');

    const blocked = await api()
      .delete(`/api/v1/vehicles/${vehicle.id}`)
      .set('Cookie', owner.cookie);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('VEHICLE_HAS_ACTIVE_BOOKINGS');

    await api()
      .patch(`/api/v1/bookings/${booking.body.data.id}/reject`)
      .set('Cookie', owner.cookie)
      .expect(200);
    await api().delete(`/api/v1/vehicles/${vehicle.id}`).set('Cookie', owner.cookie).expect(200);
    await api().get(`/api/v1/vehicles/${vehicle.id}`).expect(404);

    // History survives: the customer can still open their booking.
    await api()
      .get(`/api/v1/bookings/${booking.body.data.id}`)
      .set('Cookie', customer.cookie)
      .expect(200);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    await api().get('/api/v1/vehicles/not-an-id').expect(400);
    await api().get('/api/v1/vehicles/0123456789abcdef01234567').expect(404);
  });
});

describe('vehicle discovery', () => {
  async function seedCatalogue() {
    const owner = await registerOwner();
    const city = await createVehicle(owner, {
      name: 'Honda City',
      type: 'CAR',
      dailyPrice: 1800,
      location: 'Coimbatore',
    });
    const creta = await createVehicle(owner, {
      name: 'Hyundai Creta',
      type: 'SUV',
      dailyPrice: 2600,
      location: 'Coimbatore',
    });
    const bike = await createVehicle(owner, {
      name: 'Royal Enfield Classic',
      type: 'BIKE',
      dailyPrice: 900,
      location: 'Bengaluru',
      features: ['Helmet'],
    });
    const van = await createVehicle(owner, {
      name: 'Toyota Innova',
      type: 'VAN',
      dailyPrice: 3500,
      location: 'Chennai',
    });
    return { owner, city, creta, bike, van };
  }

  const names = (res: { body: { data: { items: { name: string }[] } } }) =>
    res.body.data.items.map((item) => item.name).sort();

  it('supports search-as-you-type on partial words', async () => {
    await seedCatalogue();
    const res = await api().get('/api/v1/vehicles').query({ search: 'hon' });
    expect(names(res)).toEqual(['Honda City']);
    const multi = await api().get('/api/v1/vehicles').query({ search: 'royal class' });
    expect(names(multi)).toEqual(['Royal Enfield Classic']);
  });

  it('filters by type, location prefix and price range', async () => {
    await seedCatalogue();
    expect(names(await api().get('/api/v1/vehicles').query({ type: 'SUV' }))).toEqual([
      'Hyundai Creta',
    ]);
    expect(names(await api().get('/api/v1/vehicles').query({ location: 'coim' }))).toEqual([
      'Honda City',
      'Hyundai Creta',
    ]);
    expect(
      names(await api().get('/api/v1/vehicles').query({ minPrice: 1000, maxPrice: 3000 })),
    ).toEqual(['Honda City', 'Hyundai Creta']);
  });

  it('sorts and paginates with metadata', async () => {
    await seedCatalogue();
    const res = await api().get('/api/v1/vehicles').query({ sort: 'price_asc', page: 2, limit: 3 });
    expect(res.body.data.pagination).toEqual({
      page: 2,
      limit: 3,
      total: 4,
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
    });
    expect(res.body.data.items.map((v: { name: string }) => v.name)).toEqual(['Toyota Innova']);
  });

  it('caps the page size', async () => {
    const res = await api().get('/api/v1/vehicles').query({ limit: 500 });
    expect(res.status).toBe(400);
  });

  it('excludes vehicles booked or disabled for the requested dates', async () => {
    const { owner, city, creta } = await seedCatalogue();
    const customer = await registerCustomer();
    await book(customer, city.id, '2026-10-10', '2026-10-15').expect(201);
    await api()
      .patch(`/api/v1/vehicles/${creta.id}/availability`)
      .set('Cookie', owner.cookie)
      .send({ isAvailable: false })
      .expect(200);

    const overlapping = await api()
      .get('/api/v1/vehicles')
      .query({ startDate: '2026-10-12', endDate: '2026-10-14' });
    expect(names(overlapping)).toEqual(['Royal Enfield Classic', 'Toyota Innova']);

    // Back-to-back: the City is free again from its return date.
    const after = await api()
      .get('/api/v1/vehicles')
      .query({ startDate: '2026-10-15', endDate: '2026-10-16' });
    expect(names(after)).toContain('Honda City');
  });

  it('rejects an inverted date range', async () => {
    const res = await api()
      .get('/api/v1/vehicles')
      .query({ startDate: '2026-10-15', endDate: '2026-10-10' });
    expect(res.status).toBe(400);
  });
});
