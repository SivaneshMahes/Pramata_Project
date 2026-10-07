import { BookingStatus } from '@vrp/shared-types';
import type { OwnerDashboardDto } from '@vrp/shared-types';
import { dateOnlyToUtc } from '@vrp/validation';
import { Types } from 'mongoose';
import { toBookingDto } from '../mappers/index.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { vehicleRepository } from '../repositories/vehicle.repository.js';
import { businessToday } from '../utils/clock.js';

const REVENUE_MONTHS = 6;
const LIST_SIZE = 5;

/** The last N calendar months as YYYY-MM, oldest first, ending with this month. */
function recentMonths(today: string, count: number): string[] {
  const [year, month] = today.split('-').map(Number) as [number, number];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

export const dashboardService = {
  async owner(ownerId: string): Promise<OwnerDashboardDto> {
    const owner = new Types.ObjectId(ownerId);
    const today = businessToday();
    const months = recentMonths(today, REVENUE_MONTHS);
    const since = dateOnlyToUtc(`${months[0]}-01`);

    const [vehicleStats, activeRentals, pendingRequests, revenue, recent, upcoming] =
      await Promise.all([
        vehicleRepository.ownerStats(owner),
        bookingRepository.countByFilter({ owner, status: BookingStatus.HANDED_OVER }),
        bookingRepository.countByFilter({ owner, status: BookingStatus.PENDING }),
        bookingRepository.ownerRevenue(owner, since),
        bookingRepository.findPopulated({ owner }, { createdAt: -1 }, LIST_SIZE),
        bookingRepository.findPopulated(
          { owner, status: BookingStatus.APPROVED, startDate: { $gte: dateOnlyToUtc(today) } },
          { startDate: 1 },
          LIST_SIZE,
        ),
      ]);

    const revenueByMonth = new Map(revenue.monthly.map((point) => [point.month, point.revenue]));
    const context = { today };
    return {
      totalVehicles: vehicleStats.totalVehicles,
      availableVehicles: vehicleStats.availableVehicles,
      activeRentals,
      pendingRequests,
      revenue: revenue.total,
      averageRating:
        vehicleStats.reviewCount > 0
          ? Math.round((vehicleStats.ratingSum / vehicleStats.reviewCount) * 10) / 10
          : 0,
      ratedReviewCount: vehicleStats.reviewCount,
      monthlyRevenue: months.map((month) => ({ month, revenue: revenueByMonth.get(month) ?? 0 })),
      recentBookings: recent.map((booking) => toBookingDto(booking, context)),
      upcomingRentals: upcoming.map((booking) => toBookingDto(booking, context)),
    };
  },
};
