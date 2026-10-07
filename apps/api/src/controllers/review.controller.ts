import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { reviewService } from '../services/review.service.js';
import { sendSuccess } from '../utils/response.js';
import {
  createReviewSchema,
  idParamSchema,
  parseInput,
  updateReviewSchema,
} from '../validators/index.js';

export const reviewController = {
  async create(req: Request, res: Response) {
    const input = parseInput(createReviewSchema, req.body);
    sendSuccess(res, await reviewService.create(currentUser(req), input), 201);
  },

  async update(req: Request, res: Response) {
    const { id } = parseInput(idParamSchema, req.params);
    const input = parseInput(updateReviewSchema, req.body);
    sendSuccess(res, await reviewService.update(currentUser(req), id, input));
  },
};
