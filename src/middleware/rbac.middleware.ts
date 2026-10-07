import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        AppError.unauthorized('Authentication required', ErrorCode.AUTH_UNAUTHORIZED)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`,
          ErrorCode.AUTH_FORBIDDEN
        )
      );
    }

    next();
  };
};
