import { z } from 'zod';
import { EventStatus } from '../types';

export const createEventSchema = z.object({
  body: z
    .object({
      title: z
        .string({ required_error: 'Title is required' })
        .min(3, 'Title must be at least 3 characters')
        .max(150, 'Title cannot exceed 150 characters')
        .trim(),
      description: z
        .string({ required_error: 'Description is required' })
        .min(10, 'Description must be at least 10 characters')
        .max(5000, 'Description cannot exceed 5000 characters')
        .trim(),
      category: z
        .string({ required_error: 'Category is required' })
        .min(2, 'Category must be at least 2 characters')
        .max(50, 'Category cannot exceed 50 characters')
        .trim(),
      city: z
        .string({ required_error: 'City is required' })
        .min(2, 'City must be at least 2 characters')
        .max(50, 'City cannot exceed 50 characters')
        .trim(),
      venue: z
        .string({ required_error: 'Venue is required' })
        .min(3, 'Venue must be at least 3 characters')
        .max(200, 'Venue cannot exceed 200 characters')
        .trim(),
      startTime: z.string({ required_error: 'Start time is required' }).datetime({
        message: 'Start time must be a valid ISO 8601 date string',
      }),
      endTime: z.string({ required_error: 'End time is required' }).datetime({
        message: 'End time must be a valid ISO 8601 date string',
      }),
      capacity: z
        .number({ required_error: 'Capacity is required' })
        .int('Capacity must be an integer')
        .positive('Capacity must be greater than 0')
        .max(100000, 'Capacity cannot exceed 100,000'),
      price: z
        .number({ required_error: 'Price is required' })
        .nonnegative('Price cannot be negative')
        .max(1000000, 'Price cannot exceed 1,000,000'),
    })
    .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
      message: 'End time must be after start time',
      path: ['endTime'],
    })
    .refine((data) => new Date(data.startTime) > new Date(), {
      message: 'Start time must be in the future',
      path: ['startTime'],
    }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
  body: z
    .object({
      title: z.string().min(3).max(150).trim().optional(),
      description: z.string().min(10).max(5000).trim().optional(),
      category: z.string().min(2).max(50).trim().optional(),
      city: z.string().min(2).max(50).trim().optional(),
      venue: z.string().min(3).max(200).trim().optional(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      capacity: z.number().int().positive().max(100000).optional(),
      price: z.number().nonnegative().max(1000000).optional(),
      status: z.nativeEnum(EventStatus).optional(),
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return new Date(data.startTime) < new Date(data.endTime);
        }
        return true;
      },
      {
        message: 'End time must be after start time',
        path: ['endTime'],
      }
    ),
});

export const eventQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive integer')
      .transform(Number)
      .optional()
      .default('1' as any),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional()
      .default('10' as any),
    category: z.string().trim().optional(),
    city: z.string().trim().optional(),
    minPrice: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'minPrice must be a valid number')
      .transform(Number)
      .optional(),
    maxPrice: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'maxPrice must be a valid number')
      .transform(Number)
      .optional(),
    startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 date string' }).optional(),
    endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 date string' }).optional(),
    status: z.nativeEnum(EventStatus).optional(),
    availableOnly: z.string().optional().transform((val) => val === 'true'),
    search: z.string().trim().optional(),
    sort: z.enum(['startTime', 'price', 'createdAt', 'capacity']).optional().default('startTime'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
});

export const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>['body'];
export type UpdateEventInput = z.infer<typeof updateEventSchema>['body'];
export type EventQueryParams = z.infer<typeof eventQuerySchema>['query'];
