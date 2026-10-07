import { Request, Response, NextFunction } from 'express';
import { bookingService, BookingService } from '../services/booking.service';
import { sendSuccess, sendCreated } from '../utils/response.utils';

export class BookingController {
  constructor(private service: BookingService = bookingService) {}

  createBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: eventId } = req.params;
      const { quantity } = req.body;
      const userId = req.user!.sub;
      const userEmail = req.user!.email;
      const userName = (req.user as any).name || 'Valued Attendee';
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const result = await this.service.createBooking(
        userId,
        userEmail,
        userName,
        eventId,
        quantity,
        idempotencyKey
      );

      return sendCreated(res, result.booking);
    } catch (error) {
      next(error);
    }
  };

  getBookingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      const booking = await this.service.getBookingById(id, userId, userRole);
      return sendSuccess(res, booking);
    } catch (error) {
      next(error);
    }
  };

  getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { page, limit, status } = req.query as any;
      const result = await this.service.getUserBookings(
        userId,
        page ? parseInt(page, 10) : undefined,
        limit ? parseInt(limit, 10) : undefined,
        status
      );
      return sendSuccess(res, result.bookings, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  };

  cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;
      const cancelledBooking = await this.service.cancelBooking(id, userId);
      return sendSuccess(res, cancelledBooking);
    } catch (error) {
      next(error);
    }
  };
}

export const bookingController = new BookingController();
