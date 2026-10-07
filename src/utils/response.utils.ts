import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  pagination?: PaginationMeta
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(pagination ? { pagination } : {}),
  };
  return res.status(statusCode).json(payload);
};

export const sendCreated = <T>(res: Response, data: T): Response => {
  return sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};
