import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, authController.register);
authRoutes.post('/login', authRateLimiter, authController.login);
authRoutes.post('/google', authRateLimiter, authController.google);
authRoutes.post('/onboarding', authenticate, authController.completeOnboarding);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.post('/logout', authController.logout);
