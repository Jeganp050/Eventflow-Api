import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';
import { logger } from '../utils/logger.utils';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let error = err;

  // Handle SyntaxError (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && 'body' in err) {
    error = AppError.badRequest('Malformed JSON in request body', ErrorCode.BAD_REQUEST);
  }

  // If not an operational AppError, log details and convert to safe 500 error
  if (!(error instanceof AppError)) {
    logger.error('Unhandled unexpected error:', err, {
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message:
          env.NODE_ENV === 'production'
            ? 'Internal server error occurred. Please try again later.'
            : err.message || 'Internal server error occurred',
      },
    });
    return;
  }

  // Log operational warning or error
  if (error.statusCode >= 500) {
    logger.error(`Server error (${error.statusCode}): ${error.message}`, error, {
      requestId: req.requestId,
      code: error.errorCode,
    });
  } else {
    logger.debug(`Client error (${error.statusCode}): ${error.message}`, {
      requestId: req.requestId,
      code: error.errorCode,
      details: error.details,
    });
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.errorCode,
      message: error.message,
      ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(
    AppError.notFound(
      `Resource not found: Cannot ${req.method} ${req.originalUrl}`,
      ErrorCode.RESOURCE_NOT_FOUND
    )
  );
};
