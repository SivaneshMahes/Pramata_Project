import { ErrorCode } from '@vrp/shared-types';
import type { AuthUser } from '../../types/auth.js';
import { AppError } from '../../utils/AppError.js';
import { businessToday } from '../../utils/clock.js';
import { bookingService } from '../booking.service.js';
import { INVOICEABLE_STATUSES, buildInvoice } from './invoice.builder.js';
import type { Invoice } from './invoice.builder.js';
import { renderInvoicePdf } from './invoice.pdf.js';

export const invoiceService = {
  /** Same visibility as the booking itself: only its customer or owner. */
  async forBooking(user: AuthUser, bookingId: string): Promise<Invoice> {
    const booking = await bookingService.getForUser(user, bookingId);
    if (!INVOICEABLE_STATUSES.includes(booking.status)) {
      throw AppError.conflict(
        ErrorCode.INVALID_STATUS_TRANSITION,
        'An invoice is available once the owner confirms the booking.',
      );
    }
    return buildInvoice(booking, businessToday());
  },

  async pdfForBooking(
    user: AuthUser,
    bookingId: string,
  ): Promise<{ filename: string; pdf: Buffer }> {
    const invoice = await this.forBooking(user, bookingId);
    return { filename: `${invoice.number}.pdf`, pdf: await renderInvoicePdf(invoice) };
  },
};
