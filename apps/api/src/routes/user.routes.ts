import { UserRole } from '@vrp/shared-types';
import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { wishlistController } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const userRoutes = Router();
const customer = requireRole(UserRole.CUSTOMER);

userRoutes.use(authenticate);
userRoutes.get('/me', userController.getProfile);
userRoutes.patch('/me', userController.updateProfile);

userRoutes.get('/me/wishlist', customer, wishlistController.list);
userRoutes.get('/me/wishlist/ids', customer, wishlistController.ids);
userRoutes.put('/me/wishlist/:vehicleId', customer, wishlistController.add);
userRoutes.delete('/me/wishlist/:vehicleId', customer, wishlistController.remove);
