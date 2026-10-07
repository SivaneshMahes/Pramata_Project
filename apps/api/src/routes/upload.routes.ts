import { UserRole } from '@vrp/shared-types';
import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const uploadRoutes = Router();

uploadRoutes.post(
  '/vehicle-images',
  authenticate,
  requireRole(UserRole.OWNER),
  uploadController.vehicleImage,
);
