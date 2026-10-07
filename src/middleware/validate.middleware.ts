import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });

      // Assign parsed & transformed values back to request
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => {
          // Remove top-level 'body'/'query'/'params' prefix for clean field names
          const path = err.path.slice(1).join('.') || err.path.join('.');
          return {
            field: path,
            message: err.message,
          };
        });

        return next(
          AppError.badRequest('Invalid request data', ErrorCode.VALIDATION_ERROR, details)
        );
      }
      next(error);
    }
  };
};
