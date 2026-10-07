import { UserRole } from '@vrp/shared-types';
import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const reviewRoutes = Router();

reviewRoutes.use(authenticate, requireRole(UserRole.CUSTOMER));
reviewRoutes.post('/', reviewController.create);
reviewRoutes.put('/:id', reviewController.update);
