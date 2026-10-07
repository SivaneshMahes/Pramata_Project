import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import { uploadService } from '../services/upload.service.js';
import { sendSuccess } from '../utils/response.js';
import { parseInput, uploadUrlRequestSchema } from '../validators/index.js';

export const uploadController = {
  async vehicleImage(req: Request, res: Response) {
    const input = parseInput(uploadUrlRequestSchema, req.body);
    sendSuccess(res, await uploadService.createVehicleImageUpload(currentUser(req).id, input), 201);
  },
};
