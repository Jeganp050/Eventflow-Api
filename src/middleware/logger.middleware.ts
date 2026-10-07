import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.utils';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
};
