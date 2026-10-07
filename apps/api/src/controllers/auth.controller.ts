import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { authService } from '../services/auth.service.js';
import { clearAuthCookie, setAuthCookie } from '../utils/authCookie.js';
import { sendSuccess } from '../utils/response.js';
import {
  completeOnboardingSchema,
  googleSignInSchema,
  loginSchema,
  parseInput,
  registerSchema,
} from '../validators/index.js';

export const authController = {
  async register(req: Request, res: Response) {
    const session = await authService.register(parseInput(registerSchema, req.body));
    setAuthCookie(res, session.token);
    sendSuccess(res, { user: session.user }, 201);
  },

  async login(req: Request, res: Response) {
    const session = await authService.login(parseInput(loginSchema, req.body));
    setAuthCookie(res, session.token);
    sendSuccess(res, { user: session.user });
  },

  async google(req: Request, res: Response) {
    const { credential } = parseInput(googleSignInSchema, req.body);
    const session = await authService.googleSignIn(credential);
    setAuthCookie(res, session.token);
    sendSuccess(res, { user: session.user, isNewUser: session.isNewUser });
  },

  async completeOnboarding(req: Request, res: Response) {
    const { role } = parseInput(completeOnboardingSchema, req.body);
    const session = await authService.completeOnboarding(currentUser(req).id, role);
    setAuthCookie(res, session.token);
    sendSuccess(res, { user: session.user });
  },

  async me(req: Request, res: Response) {
    sendSuccess(res, { user: await authService.getCurrentUser(currentUser(req).id) });
  },

  logout(_req: Request, res: Response) {
    clearAuthCookie(res);
    sendSuccess(res, { loggedOut: true });
  },
};
