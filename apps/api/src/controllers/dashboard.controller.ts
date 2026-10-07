import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/response.js';

export const dashboardController = {
  async owner(req: Request, res: Response) {
    sendSuccess(res, await dashboardService.owner(currentUser(req).id));
  },
};
