import { UserRole } from '@vrp/shared-types';
import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const bookingRoutes = Router();
const customer = requireRole(UserRole.CUSTOMER);
const owner = requireRole(UserRole.OWNER);

bookingRoutes.use(authenticate);

bookingRoutes.post('/', customer, bookingController.create);
bookingRoutes.get('/my', customer, bookingController.listMine);
bookingRoutes.get('/my/summary', customer, bookingController.mySummary);
// Either party may view; the service enforces that the caller is one of them.
bookingRoutes.get(
  '/:id',
  requireRole(UserRole.CUSTOMER, UserRole.OWNER),
  bookingController.getById,
);
bookingRoutes.get(
  '/:id/invoice',
  requireRole(UserRole.CUSTOMER, UserRole.OWNER),
  bookingController.invoice,
);
bookingRoutes.patch('/:id/cancel', customer, bookingController.cancel);

bookingRoutes.patch('/:id/approve', owner, bookingController.approve);
bookingRoutes.patch('/:id/reject', owner, bookingController.reject);
bookingRoutes.patch('/:id/hand-over', owner, bookingController.handOver);
bookingRoutes.patch('/:id/return', owner, bookingController.markReturned);
