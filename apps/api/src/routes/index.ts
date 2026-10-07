import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.js';
import { openApiDocument } from '../docs/openapi.js';
import { healthController } from '../controllers/health.controller.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';
import { authRoutes } from './auth.routes.js';
import { bookingRoutes } from './booking.routes.js';
import { ownerRoutes } from './owner.routes.js';
import { reviewRoutes } from './review.routes.js';
import { uploadRoutes } from './upload.routes.js';
import { userRoutes } from './user.routes.js';
import { vehicleRoutes } from './vehicle.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', healthController.readiness);

if (env.ENABLE_API_DOCS) {
  apiRouter.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  apiRouter.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'Wheelhouse API' }),
  );
}

apiRouter.use(apiRateLimiter);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/owner', ownerRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/uploads', uploadRoutes);
