import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { bookingService } from '../services/booking.service.js';
import { invoiceService } from '../services/invoice/invoice.service.js';
import { sendSuccess } from '../utils/response.js';
import {
  createBookingSchema,
  idParamSchema,
  myBookingsQuerySchema,
  ownerBookingsQuerySchema,
  parseInput,
} from '../validators/index.js';

const bookingId = (req: Request) => parseInput(idParamSchema, req.params).id;

type OwnerAction = 'approve' | 'reject' | 'handOver' | 'markReturned';

/** One handler factory for the four owner lifecycle actions. */
const ownerAction = (action: OwnerAction) => async (req: Request, res: Response) => {
  sendSuccess(res, await bookingService[action](currentUser(req), bookingId(req)));
};

export const bookingController = {
  async create(req: Request, res: Response) {
    const input = parseInput(createBookingSchema, req.body);
    sendSuccess(res, await bookingService.create(currentUser(req), input), 201);
  },

  async listMine(req: Request, res: Response) {
    const query = parseInput(myBookingsQuerySchema, req.query);
    sendSuccess(res, await bookingService.listForCustomer(currentUser(req).id, query));
  },

  async mySummary(req: Request, res: Response) {
    sendSuccess(res, await bookingService.customerSummary(currentUser(req).id));
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await bookingService.getForUser(currentUser(req), bookingId(req)));
  },

  async cancel(req: Request, res: Response) {
    sendSuccess(res, await bookingService.cancel(currentUser(req), bookingId(req)));
  },

  async listForOwner(req: Request, res: Response) {
    const query = parseInput(ownerBookingsQuerySchema, req.query);
    sendSuccess(res, await bookingService.listForOwner(currentUser(req).id, query));
  },

  async invoice(req: Request, res: Response) {
    const { filename, pdf } = await invoiceService.pdfForBooking(currentUser(req), bookingId(req));
    res
      .status(200)
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .set('Cache-Control', 'private, no-store')
      .send(pdf);
  },

  approve: ownerAction('approve'),
  reject: ownerAction('reject'),
  handOver: ownerAction('handOver'),
  markReturned: ownerAction('markReturned'),
};
