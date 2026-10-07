import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export class HealthController {
  check = async (req: Request, res: Response) => {
    let dbStatus = 'connected';
    let httpStatus = 200;

    try {
      // Execute a lightweight query to verify DB connectivity
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'disconnected';
      httpStatus = 503;
    }

    return res.status(httpStatus).json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: 'eventflow-api',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };
}

export const healthController = new HealthController();
