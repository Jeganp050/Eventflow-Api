import { ErrorCode } from './errorCodes';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: ValidationErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: ValidationErrorDetail[],
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message: string,
    errorCode: ErrorCode = ErrorCode.BAD_REQUEST,
    details?: ValidationErrorDetail[]
  ): AppError {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(
    message: string = 'Authentication credentials are required or invalid',
    errorCode: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED
  ): AppError {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(
    message: string = 'You do not have permission to perform this action',
    errorCode: ErrorCode = ErrorCode.AUTH_FORBIDDEN
  ): AppError {
    return new AppError(message, 403, errorCode);
  }

  static notFound(
    message: string,
    errorCode: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND
  ): AppError {
    return new AppError(message, 404, errorCode);
  }

  static conflict(
    message: string,
    errorCode: ErrorCode = ErrorCode.INSUFFICIENT_CAPACITY
  ): AppError {
    return new AppError(message, 409, errorCode);
  }

  static unprocessable(
    message: string,
    errorCode: ErrorCode = ErrorCode.VALIDATION_ERROR,
    details?: ValidationErrorDetail[]
  ): AppError {
    return new AppError(message, 422, errorCode, details);
  }

  static tooManyRequests(
    message: string = 'Rate limit exceeded. Please try again later.',
    errorCode: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED
  ): AppError {
    return new AppError(message, 429, errorCode);
  }

  static internal(
    message: string = 'Internal server error occurred',
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR
  ): AppError {
    return new AppError(message, 500, errorCode, undefined, false);
  }
}
