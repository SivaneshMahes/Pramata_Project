import type { Request, Response } from 'express';
import { isDatabaseConnected } from '../config/database.js';

export const healthController = {
  /** Liveness for the ALB/ECS: the process is up and serving HTTP. */
  liveness(_req: Request, res: Response) {
    res.status(200).json({ status: 'ok' });
  },

  /** Readiness: also reports database connectivity (503 when it is down). */
  readiness(_req: Request, res: Response) {
    const database = isDatabaseConnected() ? 'up' : 'down';
    res.status(database === 'up' ? 200 : 503).json({
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
    });
  },
};
