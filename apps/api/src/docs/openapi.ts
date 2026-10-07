import {
  BOOKING_SCOPES,
  BOOKING_STATUSES,
  ErrorCode,
  USER_ROLES,
  VEHICLE_SORTS,
  VEHICLE_TYPES,
} from '@vrp/shared-types';

/**
 * OpenAPI 3.1 description of the public API, served at /api/v1/docs.
 * Enumerations come from @vrp/shared-types so the docs can't drift from code.
 */
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const ok = (schema: object, description = 'Success') => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: { success: { const: true }, data: schema },
      },
    },
  },
});
const err = (description: string) => ({
  description,
  content: { 'application/json': { schema: ref('Error') } },
});
const paged = (item: string) => ({
  type: 'object',
  properties: { items: { type: 'array', items: ref(item) }, pagination: ref('Pagination') },
});
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-f0-9]{24}$' },
};
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 } },
];
const date = { type: 'string', format: 'date', example: '2026-10-10' };
const secured = [{ cookieAuth: [] }, { bearerAuth: [] }];
const json = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });

const common = {
  400: err('Validation failed (VALIDATION_ERROR) or a business rule on input (e.g. INVALID_DATES)'),
  401: err('Not signed in or session expired (UNAUTHENTICATED)'),
  403: err('Wrong role or not the owner of this resource (FORBIDDEN, ONBOARDING_REQUIRED)'),
  404: err('Not found — also returned for private resources you cannot see'),
  409: err('Conflict with current state'),
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Wheelhouse Vehicle Rental API',
    version: '1.0.0',
    description: [
      'Modular-monolith REST API for vehicle rentals.',
      '',
      '**Envelope** — success: `{ "success": true, "data": … }`; error: `{ "success": false, "code": "…", "message": "…" }`.',
      '',
      '**Auth** — `POST /auth/login` sets an httpOnly `vrp_session` cookie (JWT, HS256). API clients may send the same JWT as `Authorization: Bearer`.',
      '',
      '**Dates** — rental dates are `YYYY-MM-DD` calendar days. A booking occupies `[startDate, endDate)`: the vehicle is free again on `endDate`, so back-to-back rentals are allowed.',
      '',
      '**Prices** — the client sends only vehicle + dates (+ optional coupon). Days, daily price and totals are always computed on the server.',
    ].join('\n'),
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Vehicles' },
    { name: 'Bookings' },
    { name: 'Owner' },
    { name: 'Reviews' },
    { name: 'Uploads' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'vrp_session' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'code', 'message'],
        properties: {
          success: { const: false },
          code: { type: 'string', enum: Object.values(ErrorCode) },
          message: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { path: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
        example: {
          success: false,
          code: 'BOOKING_CONFLICT',
          message: 'Vehicle is already booked for the selected dates.',
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: ['string', 'null'], enum: [...USER_ROLES, null] },
          authProvider: { enum: ['local', 'google'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      VehicleInput: {
        type: 'object',
        required: ['name', 'description', 'type', 'registrationNumber', 'dailyPrice', 'location'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Honda City' },
          description: { type: 'string', minLength: 10, maxLength: 2000 },
          images: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              required: ['url'],
              properties: { url: { type: 'string', format: 'uri' }, key: { type: 'string' } },
            },
          },
          type: { type: 'string', enum: VEHICLE_TYPES },
          registrationNumber: {
            type: 'string',
            example: 'TN 37 AB 1234',
            description:
              'Normalised to uppercase without spaces/dashes; unique among live listings.',
          },
          dailyPrice: { type: 'integer', minimum: 1, example: 1800 },
          location: { type: 'string', example: 'Coimbatore' },
          isAvailable: { type: 'boolean', default: true },
          features: {
            type: 'array',
            maxItems: 15,
            items: { type: 'string' },
            example: ['Automatic', 'AC', 'GPS'],
          },
        },
      },
      Vehicle: {
        allOf: [
          ref('VehicleInput'),
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              owner: {
                type: 'object',
                properties: { id: { type: 'string' }, name: { type: 'string' } },
              },
              averageRating: { type: 'number', example: 4.8 },
              reviewCount: { type: 'integer', example: 24 },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Availability: {
        type: 'object',
        properties: {
          available: { type: 'boolean' },
          reason: { enum: ['AVAILABLE', 'BOOKED', 'VEHICLE_UNAVAILABLE'] },
          startDate: date,
          endDate: date,
          totalDays: { type: 'integer' },
          dailyPrice: { type: 'number' },
          subtotal: { type: 'number' },
          discountAmount: { type: 'number' },
          couponCode: { type: ['string', 'null'] },
          totalAmount: { type: 'number' },
        },
      },
      Calendar: {
        type: 'object',
        properties: {
          vehicleId: { type: 'string' },
          from: date,
          to: date,
          isAvailable: { type: 'boolean' },
          bookedRanges: {
            type: 'array',
            items: {
              type: 'object',
              properties: { startDate: date, endDate: { ...date, description: 'Exclusive' } },
            },
          },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vehicle: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { enum: VEHICLE_TYPES },
              location: { type: 'string' },
              registrationNumber: { type: 'string' },
              image: { type: ['string', 'null'] },
            },
          },
          customer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          owner: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
          startDate: date,
          endDate: date,
          totalDays: { type: 'integer', example: 3 },
          dailyPrice: { type: 'number', example: 1800 },
          subtotal: { type: 'number', example: 5400 },
          discountAmount: { type: 'number', example: 0 },
          couponCode: { type: ['string', 'null'] },
          totalAmount: { type: 'number', example: 5400 },
          status: { type: 'string', enum: BOOKING_STATUSES },
          hasReview: { type: 'boolean' },
          canCancel: { type: 'boolean' },
          review: {
            oneOf: [ref('Review'), { type: 'null' }],
            description: 'Only on GET /bookings/{id}',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vehicle: { type: 'string' },
          booking: { type: 'string' },
          customer: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', maxLength: 1000 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Readiness (includes database status)',
        responses: {
          200: { description: '{ "status": "ok" }' },
          503: { description: 'Database unreachable' },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account and start a session',
        requestBody: json({
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, description: 'Letters and numbers' },
            role: { enum: USER_ROLES },
          },
        }),
        responses: {
          201: ok({ type: 'object', properties: { user: ref('User') } }),
          400: common[400],
          409: err('EMAIL_TAKEN'),
          429: err('RATE_LIMITED'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in (sets the session cookie)',
        requestBody: json({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string' }, password: { type: 'string' } },
        }),
        responses: {
          200: ok({ type: 'object', properties: { user: ref('User') } }),
          401: err('INVALID_CREDENTIALS'),
          429: err('RATE_LIMITED'),
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with a Google ID token',
        description:
          'New Google users get `role: null` and must call /auth/onboarding before using role-gated endpoints.',
        requestBody: json({
          type: 'object',
          required: ['credential'],
          properties: { credential: { type: 'string' } },
        }),
        responses: {
          200: ok({
            type: 'object',
            properties: { user: ref('User'), isNewUser: { type: 'boolean' } },
          }),
          401: common[401],
          503: err('Google sign-in not configured'),
        },
      },
    },
    '/auth/onboarding': {
      post: {
        tags: ['Auth'],
        summary: 'Choose a role (once) after Google sign-up',
        security: secured,
        requestBody: json({
          type: 'object',
          required: ['role'],
          properties: { role: { enum: USER_ROLES } },
        }),
        responses: {
          200: ok({ type: 'object', properties: { user: ref('User') } }),
          409: err('Role already set'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: secured,
        responses: {
          200: ok({ type: 'object', properties: { user: ref('User') } }),
          401: common[401],
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Clear the session cookie',
        responses: { 200: ok({ type: 'object' }) },
      },
    },

    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Profile',
        security: secured,
        responses: { 200: ok({ type: 'object', properties: { user: ref('User') } }) },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update name',
        security: secured,
        requestBody: json({ type: 'object', properties: { name: { type: 'string' } } }),
        responses: {
          200: ok({ type: 'object', properties: { user: ref('User') } }),
          400: common[400],
        },
      },
    },
    '/users/me/wishlist': {
      get: {
        tags: ['Users'],
        summary: 'Saved vehicles (CUSTOMER)',
        security: secured,
        parameters: pageParams,
        responses: { 200: ok({ type: 'object' }) },
      },
    },
    '/users/me/wishlist/{vehicleId}': {
      put: {
        tags: ['Users'],
        summary: 'Save a vehicle (idempotent)',
        security: secured,
        parameters: [{ ...idParam, name: 'vehicleId' }],
        responses: { 200: ok({ type: 'object' }), 404: common[404] },
      },
      delete: {
        tags: ['Users'],
        summary: 'Remove a saved vehicle',
        security: secured,
        parameters: [{ ...idParam, name: 'vehicleId' }],
        responses: { 200: ok({ type: 'object' }) },
      },
    },

    '/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'Search and filter vehicles (paginated)',
        description:
          'When startDate and endDate are given, only vehicles free for the whole window (and accepting bookings) are returned, using the same overlap rule as booking creation.',
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Prefix search across name, type, location, features',
          },
          { name: 'type', in: 'query', schema: { enum: VEHICLE_TYPES } },
          {
            name: 'location',
            in: 'query',
            schema: { type: 'string' },
            description: 'Case-insensitive prefix',
          },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'startDate', in: 'query', schema: date },
          { name: 'endDate', in: 'query', schema: date },
          { name: 'owner', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { enum: VEHICLE_SORTS, default: 'newest' } },
          ...pageParams,
        ],
        responses: { 200: ok(paged('Vehicle')), 400: common[400] },
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Create a vehicle (OWNER)',
        security: secured,
        requestBody: json(ref('VehicleInput')),
        responses: {
          201: ok(ref('Vehicle')),
          400: common[400],
          403: common[403],
          409: err('REGISTRATION_TAKEN'),
        },
      },
    },
    '/vehicles/my': {
      get: {
        tags: ['Vehicles'],
        summary: 'My vehicles (OWNER)',
        security: secured,
        parameters: pageParams,
        responses: { 200: ok(paged('Vehicle')), 403: common[403] },
      },
    },
    '/vehicles/{id}': {
      get: {
        tags: ['Vehicles'],
        summary: 'Vehicle details',
        parameters: [idParam],
        responses: { 200: ok(ref('Vehicle')), 404: common[404] },
      },
      put: {
        tags: ['Vehicles'],
        summary: 'Replace vehicle details (owner only)',
        security: secured,
        parameters: [idParam],
        requestBody: json(ref('VehicleInput')),
        responses: {
          200: ok(ref('Vehicle')),
          403: common[403],
          404: common[404],
          409: err('REGISTRATION_TAKEN'),
        },
      },
      delete: {
        tags: ['Vehicles'],
        summary: 'Delete (soft) a vehicle without active bookings',
        security: secured,
        parameters: [idParam],
        responses: {
          200: ok({ type: 'object' }),
          403: common[403],
          409: err('VEHICLE_HAS_ACTIVE_BOOKINGS'),
        },
      },
    },
    '/vehicles/{id}/availability': {
      get: {
        tags: ['Vehicles'],
        summary: 'Check dates and get a server-side price quote',
        parameters: [
          idParam,
          { name: 'startDate', in: 'query', required: true, schema: date },
          { name: 'endDate', in: 'query', required: true, schema: date },
          { name: 'couponCode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: ok(ref('Availability')), 400: common[400], 404: common[404] },
      },
      patch: {
        tags: ['Vehicles'],
        summary: 'Pause or resume bookings (owner only)',
        security: secured,
        parameters: [idParam],
        requestBody: json({
          type: 'object',
          required: ['isAvailable'],
          properties: { isAvailable: { type: 'boolean' } },
        }),
        responses: { 200: ok(ref('Vehicle')), 403: common[403] },
      },
    },
    '/vehicles/{id}/calendar': {
      get: {
        tags: ['Vehicles'],
        summary: 'Booked ranges for a window (≤ 400 days)',
        parameters: [
          idParam,
          { name: 'from', in: 'query', required: true, schema: date },
          { name: 'to', in: 'query', required: true, schema: date },
        ],
        responses: { 200: ok(ref('Calendar')) },
      },
    },
    '/vehicles/{id}/reviews': {
      get: {
        tags: ['Reviews'],
        summary: 'Reviews for a vehicle',
        parameters: [idParam, ...pageParams],
        responses: { 200: ok(paged('Review')) },
      },
    },

    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Request a booking (CUSTOMER)',
        security: secured,
        description:
          'Runs in a MongoDB transaction that first writes the vehicle document, so concurrent requests for the same vehicle are serialised; the loser sees the winner and receives 409.',
        requestBody: json({
          type: 'object',
          required: ['vehicle', 'startDate', 'endDate'],
          properties: {
            vehicle: { type: 'string' },
            startDate: date,
            endDate: { ...date, example: '2026-10-15' },
            couponCode: { type: 'string' },
          },
        }),
        responses: {
          201: ok(ref('Booking')),
          400: common[400],
          403: common[403],
          404: common[404],
          409: err('BOOKING_CONFLICT or VEHICLE_UNAVAILABLE'),
        },
      },
    },
    '/bookings/my': {
      get: {
        tags: ['Bookings'],
        summary: 'My bookings (CUSTOMER)',
        security: secured,
        parameters: [
          { name: 'scope', in: 'query', schema: { enum: BOOKING_SCOPES } },
          ...pageParams,
        ],
        responses: { 200: ok(paged('Booking')) },
      },
    },
    '/bookings/my/summary': {
      get: {
        tags: ['Bookings'],
        summary: 'Counts and total spent (CUSTOMER)',
        security: secured,
        responses: { 200: ok({ type: 'object' }) },
      },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Booking detail (its customer or owner only)',
        security: secured,
        parameters: [idParam],
        responses: { 200: ok(ref('Booking')), 404: common[404] },
      },
    },
    '/bookings/{id}/invoice': {
      get: {
        tags: ['Bookings'],
        summary: 'PDF invoice (approved and later)',
        security: secured,
        parameters: [idParam],
        responses: { 200: { description: 'application/pdf' }, 404: common[404], 409: common[409] },
      },
    },
    '/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel a pending/approved booking before its start date (CUSTOMER)',
        security: secured,
        parameters: [idParam],
        responses: {
          200: ok(ref('Booking')),
          409: err('BOOKING_NOT_CANCELLABLE or INVALID_STATUS_TRANSITION'),
        },
      },
    },
    '/bookings/{id}/approve': {
      patch: {
        tags: ['Owner'],
        summary: 'PENDING → APPROVED',
        security: secured,
        parameters: [idParam],
        responses: {
          200: ok(ref('Booking')),
          404: common[404],
          409: err('INVALID_STATUS_TRANSITION'),
        },
      },
    },
    '/bookings/{id}/reject': {
      patch: {
        tags: ['Owner'],
        summary: 'PENDING → REJECTED',
        security: secured,
        parameters: [idParam],
        responses: { 200: ok(ref('Booking')), 409: err('INVALID_STATUS_TRANSITION') },
      },
    },
    '/bookings/{id}/hand-over': {
      patch: {
        tags: ['Owner'],
        summary: 'APPROVED → HANDED_OVER (from the start date)',
        security: secured,
        parameters: [idParam],
        responses: { 200: ok(ref('Booking')), 409: err('INVALID_STATUS_TRANSITION') },
      },
    },
    '/bookings/{id}/return': {
      patch: {
        tags: ['Owner'],
        summary: 'HANDED_OVER → RETURNED',
        security: secured,
        parameters: [idParam],
        responses: { 200: ok(ref('Booking')), 409: err('INVALID_STATUS_TRANSITION') },
      },
    },
    '/owner/bookings': {
      get: {
        tags: ['Owner'],
        summary: 'Bookings for my vehicles',
        security: secured,
        parameters: [
          { name: 'status', in: 'query', schema: { enum: BOOKING_STATUSES } },
          { name: 'vehicle', in: 'query', schema: { type: 'string' } },
          ...pageParams,
        ],
        responses: { 200: ok(paged('Booking')) },
      },
    },
    '/owner/dashboard': {
      get: {
        tags: ['Owner'],
        summary: 'Fleet, rentals, revenue and rating summary',
        security: secured,
        responses: { 200: ok({ type: 'object' }) },
      },
    },

    '/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Review a returned rental (once per booking)',
        security: secured,
        requestBody: json({
          type: 'object',
          required: ['booking', 'rating'],
          properties: {
            booking: { type: 'string' },
            vehicle: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
          },
        }),
        responses: {
          201: ok(ref('Review')),
          404: common[404],
          409: err('REVIEW_NOT_ALLOWED or REVIEW_EXISTS'),
        },
      },
    },
    '/reviews/{id}': {
      put: {
        tags: ['Reviews'],
        summary: 'Edit my review',
        security: secured,
        parameters: [idParam],
        requestBody: json({
          type: 'object',
          required: ['rating'],
          properties: { rating: { type: 'integer' }, comment: { type: 'string' } },
        }),
        responses: { 200: ok(ref('Review')), 403: common[403] },
      },
    },

    '/uploads/vehicle-images': {
      post: {
        tags: ['Uploads'],
        summary: 'Get a presigned S3 PUT URL for a vehicle photo (OWNER)',
        security: secured,
        description:
          'The browser uploads the file directly to S3; the signature pins content type and exact size. Store the returned `{ url: publicUrl, key }` in the vehicle images.',
        requestBody: json({
          type: 'object',
          required: ['contentType', 'contentLength'],
          properties: {
            contentType: { enum: ['image/jpeg', 'image/png', 'image/webp'] },
            contentLength: { type: 'integer', maximum: 5242880 },
          },
        }),
        responses: {
          201: ok({
            type: 'object',
            properties: {
              uploadUrl: { type: 'string' },
              key: { type: 'string' },
              publicUrl: { type: 'string' },
              expiresIn: { type: 'integer' },
              headers: { type: 'object' },
            },
          }),
          503: err('Uploads not configured'),
        },
      },
    },
  },
} as const;
