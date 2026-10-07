import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';

export const generateAccessToken = (payload: { sub: string; role: any; email: string }): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const generateRefreshToken = (payload: { sub: string }): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Access token has expired', ErrorCode.AUTH_TOKEN_EXPIRED);
    }
    throw AppError.unauthorized('Invalid access token', ErrorCode.AUTH_TOKEN_INVALID);
  }
};

export const verifyRefreshToken = (token: string): { sub: string } => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Refresh token has expired', ErrorCode.AUTH_TOKEN_EXPIRED);
    }
    throw AppError.unauthorized('Invalid refresh token', ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
  }
};
