export type {
  AuthResultDto,
  AvailabilityDto,
  BookingDetailDto,
  BookingDto,
  BookingScope,
  BookingStatus,
  CustomerSummaryDto,
  OwnerDashboardDto,
  Paginated,
  PaginationMeta,
  ReviewDto,
  UserDto,
  UserRole,
  VehicleCalendarDto,
  VehicleDto,
  VehicleSort,
  VehicleType,
} from '@vrp/shared-types';

/** Browse filters as they live in the URL. Empty strings mean "not set". */
export interface VehicleFilters {
  search: string;
  type: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  startDate: string;
  endDate: string;
  sort: string;
  page: number;
}
