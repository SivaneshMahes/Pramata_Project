import { UserRole } from '@vrp/shared-types';
import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const ownerRoutes = Router();

ownerRoutes.use(authenticate, requireRole(UserRole.OWNER));
ownerRoutes.get('/bookings', bookingController.listForOwner);
ownerRoutes.get('/dashboard', dashboardController.owner);
