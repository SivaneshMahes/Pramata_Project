/**
 * Seeds a local/dev database with demo owners, customers, vehicles, bookings
 * in every lifecycle state, reviews and coupons. It wipes the collections it
 * seeds, so it refuses to run in production.
 *
 *   npm run seed            (uses apps/api/.env)
 */
import bcrypt from 'bcryptjs';
import { BookingStatus, DiscountType, UserRole, VehicleType } from '@vrp/shared-types';
import type {
  BookingStatus as BookingStatusType,
  VehicleType as VehicleTypeValue,
} from '@vrp/shared-types';
import { addDays, dateOnlyToUtc, rentalDays } from '@vrp/validation';
import type { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  BookingModel,
  CouponModel,
  ReviewModel,
  UserModel,
  VehicleModel,
} from '../models/index.js';
import type { VehicleDocument } from '../models/index.js';
import { businessToday } from '../utils/clock.js';

const DEMO_PASSWORD = 'Password123';
const img = (id: string) => ({
  url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`,
});

interface SeedVehicle {
  name: string;
  type: VehicleTypeValue;
  dailyPrice: number;
  location: string;
  registrationNumber: string;
  features: string[];
  images: { url: string }[];
  description: string;
  isAvailable?: boolean;
}

const VEHICLES: SeedVehicle[] = [
  {
    name: 'Honda City',
    type: VehicleType.CAR,
    dailyPrice: 1800,
    location: 'Coimbatore',
    registrationNumber: 'TN37AB1234',
    features: ['Automatic', 'AC', 'GPS'],
    images: [img('photo-1549317661-bd32c8ce0db2'), img('photo-1552519507-da3b142c6e3d')],
    description:
      'A comfortable, fuel-efficient sedan for city drives and weekend trips. Serviced every 5,000 km.',
  },
  {
    name: 'Hyundai Creta',
    type: VehicleType.SUV,
    dailyPrice: 2600,
    location: 'Coimbatore',
    registrationNumber: 'TN37CD5678',
    features: ['Automatic', 'AC', 'Sunroof', 'Cruise control'],
    images: [img('photo-1519641471654-76ce0107ad1b')],
    description:
      'Spacious compact SUV with a panoramic sunroof. Great for families and hill-station drives.',
  },
  {
    name: 'Mahindra Thar',
    type: VehicleType.SUV,
    dailyPrice: 3200,
    location: 'Ooty',
    registrationNumber: 'TN43EF9012',
    features: ['4x4', 'Manual', 'Convertible top'],
    images: [img('photo-1533473359331-0135ef1b58bf')],
    description:
      'Go-anywhere 4x4 built for the Nilgiris. Removable top for open-air drives on clear days.',
  },
  {
    name: 'Royal Enfield Classic 350',
    type: VehicleType.BIKE,
    dailyPrice: 900,
    location: 'Bengaluru',
    registrationNumber: 'KA01GH3456',
    features: ['Helmet included', 'Saddle bags'],
    images: [img('photo-1558981806-ec527fa84c39')],
    description:
      'The classic thumper for long highway rides. Two helmets and saddle bags included.',
  },
  {
    name: 'KTM Duke 390',
    type: VehicleType.BIKE,
    dailyPrice: 1200,
    location: 'Bengaluru',
    registrationNumber: 'KA05JK7890',
    features: ['ABS', 'Helmet included'],
    images: [img('photo-1568772585407-9361f9bf3a87')],
    description: 'Light, quick and agile naked street bike with dual-channel ABS.',
  },
  {
    name: 'Toyota Innova Crysta',
    type: VehicleType.VAN,
    dailyPrice: 3500,
    location: 'Chennai',
    registrationNumber: 'TN09LM2345',
    features: ['7 seats', 'AC', 'Automatic'],
    images: [img('photo-1544636331-e26879cd4d9b')],
    description:
      'Seven-seat people mover with captain chairs. Ideal for airport runs and group travel.',
  },
  {
    name: 'Maruti Swift',
    type: VehicleType.CAR,
    dailyPrice: 1300,
    location: 'Chennai',
    registrationNumber: 'TN10NP6789',
    features: ['Manual', 'AC', 'Bluetooth'],
    images: [img('photo-1494976388531-d1058494cdd8')],
    description:
      'Nimble hatchback that is easy to park and light on fuel. Perfect for city errands.',
  },
  {
    name: 'Tata Nexon EV',
    type: VehicleType.SUV,
    dailyPrice: 2400,
    location: 'Coimbatore',
    registrationNumber: 'TN38QR1122',
    features: ['Electric', 'Automatic', 'Fast charging'],
    images: [img('photo-1580273916550-e323be2ae537')],
    description: 'Quiet, zero-emission compact SUV with roughly 300 km of real-world range.',
  },
  {
    name: 'Force Traveller',
    type: VehicleType.VAN,
    dailyPrice: 4800,
    location: 'Madurai',
    registrationNumber: 'TN59ST3344',
    features: ['12 seats', 'AC', 'Luggage carrier'],
    images: [img('photo-1506015391300-4802dc74de2e')],
    description: 'Twelve-seat van for temple tours, weddings and team outings.',
    isAvailable: false,
  },
  {
    name: 'Skoda Slavia',
    type: VehicleType.CAR,
    dailyPrice: 2200,
    location: 'Bengaluru',
    registrationNumber: 'KA03UV5566',
    features: ['Automatic', 'AC', 'Ventilated seats'],
    images: [img('photo-1503376780353-7e6692767b70')],
    description: 'Refined mid-size sedan with a punchy turbo engine and a big boot.',
  },
];

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }
  await connectDatabase();
  const models = [UserModel, VehicleModel, BookingModel, ReviewModel, CouponModel] as const;
  for (const model of models) {
    await model.collection.deleteMany({});
    await model.syncIndexes();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);
  const [ownerA, ownerB, customerA, customerB] = await UserModel.create([
    { name: 'Arun Kumar', email: 'owner@demo.com', passwordHash, role: UserRole.OWNER },
    { name: 'Meera Nair', email: 'owner2@demo.com', passwordHash, role: UserRole.OWNER },
    { name: 'Priya Sharma', email: 'customer@demo.com', passwordHash, role: UserRole.CUSTOMER },
    { name: 'Rahul Verma', email: 'customer2@demo.com', passwordHash, role: UserRole.CUSTOMER },
  ]);
  if (!ownerA || !ownerB || !customerA || !customerB) throw new Error('User seed failed');

  const vehicles: VehicleDocument[] = [];
  for (const [index, vehicle] of VEHICLES.entries()) {
    // .create() per document so the pre-validate search-token hook runs.
    vehicles.push(
      await VehicleModel.create({ ...vehicle, owner: index % 3 === 2 ? ownerB._id : ownerA._id }),
    );
  }

  const today = businessToday();
  const booking = (
    vehicleIndex: number,
    customer: Types.ObjectId,
    startOffset: number,
    days: number,
    status: BookingStatusType,
  ) => {
    const vehicle = vehicles[vehicleIndex]!;
    const startDate = addDays(today, startOffset);
    const endDate = addDays(startDate, days);
    const totalDays = rentalDays(startDate, endDate);
    const total = totalDays * vehicle.dailyPrice;
    return {
      vehicle: vehicle._id,
      owner: vehicle.owner,
      customer,
      startDate: dateOnlyToUtc(startDate),
      endDate: dateOnlyToUtc(endDate),
      totalDays,
      dailyPrice: vehicle.dailyPrice,
      subtotal: total,
      discountAmount: 0,
      couponCode: null,
      totalAmount: total,
      status,
      statusHistory: [{ status, at: new Date(), by: null }],
    };
  };

  const bookings = await BookingModel.create([
    booking(0, customerA._id, -40, 3, BookingStatus.RETURNED),
    booking(1, customerA._id, -25, 4, BookingStatus.RETURNED),
    booking(3, customerB._id, -18, 2, BookingStatus.RETURNED),
    booking(0, customerB._id, -10, 2, BookingStatus.RETURNED),
    booking(6, customerA._id, -60, 5, BookingStatus.RETURNED),
    booking(2, customerA._id, -1, 4, BookingStatus.HANDED_OVER),
    booking(0, customerA._id, 3, 3, BookingStatus.APPROVED),
    booking(1, customerB._id, 6, 2, BookingStatus.PENDING),
    booking(5, customerA._id, 12, 3, BookingStatus.PENDING),
    booking(3, customerA._id, 20, 2, BookingStatus.CANCELLED),
    booking(4, customerB._id, 9, 1, BookingStatus.REJECTED),
    booking(0, customerB._id, 0, 2, BookingStatus.APPROVED),
  ]);

  const reviews = [
    { b: 0, rating: 5, comment: 'Spotless car and a smooth pickup. Would rent again.' },
    { b: 1, rating: 4, comment: 'Great SUV for the family trip. Sunroof was a hit with the kids.' },
    { b: 2, rating: 5, comment: 'Bike was in perfect condition. Helmets were clean too.' },
    { b: 3, rating: 4, comment: 'Good value for the price. Handover was quick.' },
  ];
  await ReviewModel.create(
    reviews.map(({ b, rating, comment }) => ({
      booking: bookings[b]!._id,
      vehicle: bookings[b]!.vehicle,
      customer: bookings[b]!.customer,
      rating,
      comment,
    })),
  );
  const stats = await ReviewModel.aggregate<{ _id: Types.ObjectId; avg: number; count: number }>([
    { $group: { _id: '$vehicle', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Promise.all(
    stats.map((row) =>
      VehicleModel.updateOne(
        { _id: row._id },
        { $set: { averageRating: Math.round(row.avg * 10) / 10, reviewCount: row.count } },
      ),
    ),
  );

  const nextYear = dateOnlyToUtc(addDays(today, 365));
  await CouponModel.create([
    {
      code: 'WELCOME10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscount: 1000,
      minimumAmount: 0,
      expiresAt: nextYear,
    },
    {
      code: 'FLAT500',
      discountType: DiscountType.FLAT,
      discountValue: 500,
      maxDiscount: null,
      minimumAmount: 3000,
      expiresAt: nextYear,
      usageLimit: 100,
    },
  ]);

  logger.info(
    { users: 4, vehicles: vehicles.length, bookings: bookings.length, reviews: reviews.length },
    `Seed complete. Demo password for every account: ${DEMO_PASSWORD}`,
  );
  await disconnectDatabase();
}

main().catch(async (error: unknown) => {
  logger.error({ err: error }, 'Seed failed');
  await disconnectDatabase();
  process.exit(1);
});
