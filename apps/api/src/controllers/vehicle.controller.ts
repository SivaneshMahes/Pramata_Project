import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { availabilityService } from '../services/availability.service.js';
import { reviewService } from '../services/review.service.js';
import { vehicleService } from '../services/vehicle.service.js';
import { sendSuccess } from '../utils/response.js';
import {
  calendarQuerySchema,
  idParamSchema,
  paginationQuerySchema,
  parseInput,
  quoteQuerySchema,
  vehicleAvailabilityUpdateSchema,
  vehicleInputSchema,
  vehicleQuerySchema,
} from '../validators/index.js';

const vehicleId = (req: Request) => parseInput(idParamSchema, req.params).id;

export const vehicleController = {
  async list(req: Request, res: Response) {
    sendSuccess(res, await vehicleService.list(parseInput(vehicleQuerySchema, req.query)));
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await vehicleService.getById(vehicleId(req)));
  },

  async listMine(req: Request, res: Response) {
    const page = parseInput(paginationQuerySchema, req.query);
    sendSuccess(res, await vehicleService.listForOwner(currentUser(req), page));
  },

  async create(req: Request, res: Response) {
    const input = parseInput(vehicleInputSchema, req.body);
    sendSuccess(res, await vehicleService.create(currentUser(req), input), 201);
  },

  async update(req: Request, res: Response) {
    const input = parseInput(vehicleInputSchema, req.body);
    sendSuccess(res, await vehicleService.update(currentUser(req), vehicleId(req), input));
  },

  async setAvailability(req: Request, res: Response) {
    const { isAvailable } = parseInput(vehicleAvailabilityUpdateSchema, req.body);
    sendSuccess(
      res,
      await vehicleService.setAvailability(currentUser(req), vehicleId(req), isAvailable),
    );
  },

  async remove(req: Request, res: Response) {
    await vehicleService.remove(currentUser(req), vehicleId(req));
    sendSuccess(res, { deleted: true });
  },

  async checkAvailability(req: Request, res: Response) {
    const { startDate, endDate, couponCode } = parseInput(quoteQuerySchema, req.query);
    sendSuccess(
      res,
      await availabilityService.check(vehicleId(req), startDate, endDate, couponCode),
    );
  },

  async calendar(req: Request, res: Response) {
    const { from, to } = parseInput(calendarQuerySchema, req.query);
    sendSuccess(res, await availabilityService.calendar(vehicleId(req), from, to));
  },

  async listReviews(req: Request, res: Response) {
    const page = parseInput(paginationQuerySchema, req.query);
    sendSuccess(res, await reviewService.listForVehicle(vehicleId(req), page));
  },
};
