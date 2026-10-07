import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { parseInput, updateProfileSchema } from '../validators/index.js';

export const userController = {
  async getProfile(req: Request, res: Response) {
    sendSuccess(res, { user: await authService.getCurrentUser(currentUser(req).id) });
  },

  async updateProfile(req: Request, res: Response) {
    const input = parseInput(updateProfileSchema, req.body);
    sendSuccess(res, { user: await authService.updateProfile(currentUser(req).id, input) });
  },
};
