import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../middleware/authenticate.js';
import { wishlistService } from '../services/wishlist.service.js';
import { sendSuccess } from '../utils/response.js';
import { objectIdSchema, paginationQuerySchema, parseInput } from '../validators/index.js';

const vehicleParam = z.object({ vehicleId: objectIdSchema });

export const wishlistController = {
  async list(req: Request, res: Response) {
    const page = parseInput(paginationQuerySchema, req.query);
    sendSuccess(res, await wishlistService.list(currentUser(req).id, page));
  },

  async ids(req: Request, res: Response) {
    sendSuccess(res, { vehicleIds: await wishlistService.ids(currentUser(req).id) });
  },

  async add(req: Request, res: Response) {
    const { vehicleId } = parseInput(vehicleParam, req.params);
    await wishlistService.add(currentUser(req).id, vehicleId);
    sendSuccess(res, { saved: true });
  },

  async remove(req: Request, res: Response) {
    const { vehicleId } = parseInput(vehicleParam, req.params);
    await wishlistService.remove(currentUser(req).id, vehicleId);
    sendSuccess(res, { saved: false });
  },
};
