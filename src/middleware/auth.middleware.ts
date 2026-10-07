import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      AppError.unauthorized(
        'Authentication token required. Format: Bearer <token>',
        ErrorCode.AUTH_UNAUTHORIZED
      )
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};
