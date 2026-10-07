export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  OWNER: 'OWNER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const USER_ROLES = Object.values(UserRole) as [UserRole, ...UserRole[]];

export const VehicleType = {
  CAR: 'CAR',
  SUV: 'SUV',
  BIKE: 'BIKE',
  VAN: 'VAN',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];
export const VEHICLE_TYPES = Object.values(VehicleType) as [VehicleType, ...VehicleType[]];

export const BookingStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  HANDED_OVER: 'HANDED_OVER',
  RETURNED: 'RETURNED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];
export const BOOKING_STATUSES = Object.values(BookingStatus) as [BookingStatus, ...BookingStatus[]];

/** Statuses that occupy the vehicle's calendar. Everything else frees the dates. */
export const BLOCKING_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.APPROVED,
  BookingStatus.HANDED_OVER,
];

/**
 * The booking lifecycle. This table is the single definition of every legal
 * transition; the API state machine and the UI action menus both read from it.
 */
export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  PENDING: [BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
  APPROVED: [BookingStatus.HANDED_OVER, BookingStatus.CANCELLED],
  HANDED_OVER: [BookingStatus.RETURNED],
  REJECTED: [],
  CANCELLED: [],
  RETURNED: [],
};

export const canTransition = (from: BookingStatus, to: BookingStatus): boolean =>
  BOOKING_TRANSITIONS[from].includes(to);

export const BookingScope = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  PREVIOUS: 'previous',
} as const;
export type BookingScope = (typeof BookingScope)[keyof typeof BookingScope];
export const BOOKING_SCOPES = Object.values(BookingScope) as [BookingScope, ...BookingScope[]];

export const BOOKING_SCOPE_STATUSES: Readonly<Record<BookingScope, readonly BookingStatus[]>> = {
  upcoming: [BookingStatus.PENDING, BookingStatus.APPROVED],
  active: [BookingStatus.HANDED_OVER],
  previous: [BookingStatus.RETURNED, BookingStatus.CANCELLED, BookingStatus.REJECTED],
};

export const VehicleSort = {
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RATING: 'rating',
} as const;
export type VehicleSort = (typeof VehicleSort)[keyof typeof VehicleSort];
export const VEHICLE_SORTS = Object.values(VehicleSort) as [VehicleSort, ...VehicleSort[]];

export const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FLAT: 'FLAT',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];
export const DISCOUNT_TYPES = Object.values(DiscountType) as [DiscountType, ...DiscountType[]];

/** Business limits shared by the API (enforcement) and the UI (guidance). */
export const BOOKING_LIMITS = {
  MAX_RENTAL_DAYS: 90,
  MAX_ADVANCE_DAYS: 365,
} as const;

export const PAGINATION_LIMITS = {
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
} as const;
