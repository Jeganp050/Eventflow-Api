import { z } from 'zod';
import { CONSTANTS } from '../config/constants';

export const createBookingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
  body: z.object({
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(
        CONSTANTS.BOOKING.DEFAULT_MAX_TICKETS,
        `Quantity cannot exceed ${CONSTANTS.BOOKING.DEFAULT_MAX_TICKETS} tickets per booking`
      ),
  }),
  headers: z
    .object({
      'idempotency-key': z.string().min(1).max(255).optional(),
    })
    .passthrough(),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid booking ID format'),
  }),
});

export const bookingQuerySchema = z.object({
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
    status: z.enum(['CONFIRMED', 'CANCELLED', 'REFUNDED']).optional(),
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
export type BookingQueryParams = z.infer<typeof bookingQuerySchema>['query'];
