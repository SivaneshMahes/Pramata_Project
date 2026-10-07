import { VEHICLE_SORTS, VEHICLE_TYPES } from '@vrp/shared-types';
import { z } from 'zod';
import {
  dateOnlySchema,
  emptyToUndefined,
  objectIdSchema,
  optionalQuery,
  paginationQuerySchema,
} from './common.js';

export const MAX_VEHICLE_IMAGES = 8;
export const MAX_VEHICLE_FEATURES = 15;
export const MAX_DAILY_PRICE = 1_000_000;

export const vehicleImageSchema = z.object({
  url: z
    .url({ protocol: /^https?$/, error: 'Image must be an http(s) URL' })
    .max(2048, 'Image URL is too long'),
  key: z.string().max(512).optional(),
});

/** Stored normalised (uppercase, no spaces or dashes) so uniqueness is reliable. */
export const registrationNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/[\s-]+/g, ''))
  .pipe(
    z
      .string()
      .min(4, 'Registration number is too short')
      .max(15, 'Registration number is too long')
      .regex(/^[A-Z0-9]+$/, 'Use letters and numbers only'),
  );

const featureSchema = z
  .string()
  .trim()
  .min(1)
  .max(40, 'Each feature must be at most 40 characters');

export const vehicleInputSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100, 'Name is too long'),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the vehicle in at least 10 characters')
    .max(2000, 'Description is too long'),
  images: z
    .array(vehicleImageSchema)
    .max(MAX_VEHICLE_IMAGES, `Add at most ${MAX_VEHICLE_IMAGES} images`)
    .default([]),
  type: z.enum(VEHICLE_TYPES, 'Choose a vehicle type'),
  registrationNumber: registrationNumberSchema,
  dailyPrice: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number('Enter a daily price')
      .int('Use a whole amount')
      .min(1, 'Daily price must be at least 1')
      .max(MAX_DAILY_PRICE, 'Daily price is too high'),
  ),
  location: z.string().trim().min(2, 'Location is required').max(80, 'Location is too long'),
  isAvailable: z.boolean().default(true),
  features: z
    .array(featureSchema)
    .max(MAX_VEHICLE_FEATURES, `Add at most ${MAX_VEHICLE_FEATURES} features`)
    .default([])
    .transform((list) => [...new Set(list)]),
});
export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const vehicleAvailabilityUpdateSchema = z.object({
  isAvailable: z.boolean(),
});
export type VehicleAvailabilityUpdateInput = z.infer<typeof vehicleAvailabilityUpdateSchema>;

const dateRangeRefinement = (
  value: { startDate?: string | undefined; endDate?: string | undefined },
  ctx: z.RefinementCtx,
) => {
  const { startDate, endDate } = value;
  if (Boolean(startDate) !== Boolean(endDate)) {
    ctx.addIssue({
      code: 'custom',
      path: [startDate ? 'endDate' : 'startDate'],
      message: 'Provide both a start and an end date',
    });
    return;
  }
  if (startDate && endDate && endDate <= startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date must be after start date',
    });
  }
};

export const vehicleQuerySchema = paginationQuerySchema
  .extend({
    search: optionalQuery(z.string().trim().max(100)),
    type: optionalQuery(z.enum(VEHICLE_TYPES)),
    location: optionalQuery(z.string().trim().max(80)),
    minPrice: optionalQuery(z.coerce.number().min(0).max(MAX_DAILY_PRICE)),
    maxPrice: optionalQuery(z.coerce.number().min(0).max(MAX_DAILY_PRICE)),
    startDate: optionalQuery(dateOnlySchema),
    endDate: optionalQuery(dateOnlySchema),
    owner: optionalQuery(objectIdSchema),
    sort: z.preprocess(emptyToUndefined, z.enum(VEHICLE_SORTS).default('newest')),
  })
  .superRefine((value, ctx) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'Max price must exceed min price',
      });
    }
    dateRangeRefinement(value, ctx);
  });
export type VehicleQuery = z.infer<typeof vehicleQuerySchema>;

export const dateRangeQuerySchema = z
  .object({ startDate: dateOnlySchema, endDate: dateOnlySchema })
  .superRefine(dateRangeRefinement);
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

export const calendarQuerySchema = z
  .object({ from: dateOnlySchema, to: dateOnlySchema })
  .refine((value) => value.to > value.from, { path: ['to'], message: '"to" must be after "from"' });
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

export const uploadUrlRequestSchema = z.object({
  contentType: z.enum(
    ['image/jpeg', 'image/png', 'image/webp'],
    'Upload a JPEG, PNG or WebP image',
  ),
  contentLength: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024, 'Images must be 5 MB or smaller'),
});
export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;
