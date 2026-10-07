import { UserRole } from '@vrp/shared-types';
import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const vehicleRoutes = Router();
const owner = [authenticate, requireRole(UserRole.OWNER)];

// Public discovery
vehicleRoutes.get('/', vehicleController.list);
// Registered before "/:id" so "my" is not parsed as an id.
vehicleRoutes.get('/my', ...owner, vehicleController.listMine);
vehicleRoutes.get('/:id', vehicleController.getById);
vehicleRoutes.get('/:id/availability', vehicleController.checkAvailability);
vehicleRoutes.get('/:id/calendar', vehicleController.calendar);
vehicleRoutes.get('/:id/reviews', vehicleController.listReviews);

// Owner management (ownership is verified in the service)
vehicleRoutes.post('/', ...owner, vehicleController.create);
vehicleRoutes.put('/:id', ...owner, vehicleController.update);
vehicleRoutes.patch('/:id/availability', ...owner, vehicleController.setAvailability);
vehicleRoutes.delete('/:id', ...owner, vehicleController.remove);
