import type { BookingStatus, DiscountType, UserRole, VehicleType } from './enums.js';

/** ISO-8601 timestamp string (e.g. 2026-10-10T08:15:00.000Z). */
export type IsoDateTime = string;
/** Calendar date in YYYY-MM-DD form. Rental dates are always date-only. */
export type DateOnly = string;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  /** Null only for a Google sign-up that has not chosen a role yet. */
  role: UserRole | null;
  authProvider: 'local' | 'google';
  createdAt: IsoDateTime;
}

export interface UserSummaryDto {
  id: string;
  name: string;
}

export interface CustomerContactDto extends UserSummaryDto {
  email: string;
}

export interface VehicleImageDto {
  url: string;
  /** S3 object key when the image was uploaded through the platform. */
  key?: string;
}

export interface VehicleDto {
  id: string;
  owner: UserSummaryDto;
  name: string;
  description: string;
  images: VehicleImageDto[];
  type: VehicleType;
  registrationNumber: string;
  dailyPrice: number;
  location: string;
  isAvailable: boolean;
  features: string[];
  averageRating: number;
  reviewCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface VehicleSummaryDto {
  id: string;
  name: string;
  type: VehicleType;
  location: string;
  registrationNumber: string;
  image: string | null;
}

export interface BookingDto {
  id: string;
  vehicle: VehicleSummaryDto;
  customer: CustomerContactDto;
  owner: UserSummaryDto;
  startDate: DateOnly;
  endDate: DateOnly;
  totalDays: number;
  dailyPrice: number;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  totalAmount: number;
  status: BookingStatus;
  hasReview: boolean;
  canCancel: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ReviewDto {
  id: string;
  vehicle: string;
  booking: string;
  customer: UserSummaryDto;
  rating: number;
  comment: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BookingDetailDto extends BookingDto {
  review: ReviewDto | null;
}

export interface AvailabilityDto {
  available: boolean;
  reason: 'AVAILABLE' | 'BOOKED' | 'VEHICLE_UNAVAILABLE';
  startDate: DateOnly;
  endDate: DateOnly;
  totalDays: number;
  dailyPrice: number;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  totalAmount: number;
}

export interface BookedRangeDto {
  /** Inclusive. */
  startDate: DateOnly;
  /** Exclusive — the vehicle is free again on this date. */
  endDate: DateOnly;
}

export interface VehicleCalendarDto {
  vehicleId: string;
  from: DateOnly;
  to: DateOnly;
  isAvailable: boolean;
  bookedRanges: BookedRangeDto[];
}

export interface CustomerSummaryDto {
  upcoming: number;
  active: number;
  completed: number;
  totalSpent: number;
}

export interface MonthlyRevenuePoint {
  /** YYYY-MM */
  month: string;
  revenue: number;
}

export interface OwnerDashboardDto {
  totalVehicles: number;
  availableVehicles: number;
  activeRentals: number;
  pendingRequests: number;
  revenue: number;
  averageRating: number;
  ratedReviewCount: number;
  monthlyRevenue: MonthlyRevenuePoint[];
  recentBookings: BookingDto[];
  upcomingRentals: BookingDto[];
}

export interface AuthResultDto {
  user: UserDto;
}

export interface UploadUrlDto {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
  headers: Record<string, string>;
}

export interface CouponDto {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minimumAmount: number;
  expiresAt: IsoDateTime;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

export interface PriceQuoteDto {
  totalDays: number;
  dailyPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
}

export interface WishlistItemDto {
  vehicle: VehicleDto;
  addedAt: IsoDateTime;
}

export type NotificationEventType =
  | 'booking.created'
  | 'booking.approved'
  | 'booking.rejected'
  | 'booking.cancelled'
  | 'booking.handed_over'
  | 'booking.returned';

export interface NotificationEventDto {
  type: NotificationEventType;
  bookingId: string;
  vehicleName: string;
  status: BookingStatus;
  message: string;
  occurredAt: IsoDateTime;
}
