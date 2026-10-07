import { EventRepository, eventRepository } from '../repositories/event.repository';
import { BookingRepository, bookingRepository } from '../repositories/booking.repository';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';
import { EventStats } from '../types';

export class StatsService {
  constructor(
    private eventRepo: EventRepository = eventRepository,
    private bookingRepo: BookingRepository = bookingRepository
  ) {}

  async getEventBookings(eventId: string, organizerId: string) {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
    }

    if (event.organizerId !== organizerId) {
      throw AppError.forbidden(
        'You do not have permission to view bookings for this event',
        ErrorCode.EVENT_NOT_OWNED
      );
    }

    return this.bookingRepo.findByEventId(eventId);
  }

  async getEventStats(eventId: string, organizerId: string): Promise<EventStats> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
    }

    if (event.organizerId !== organizerId) {
      throw AppError.forbidden(
        'You do not have permission to view statistics for this event',
        ErrorCode.EVENT_NOT_OWNED
      );
    }

    const bookings = await this.bookingRepo.findByEventId(eventId);

    let confirmedCount = 0;
    let cancelledCount = 0;
    let totalRevenue = 0;
    let ticketsSold = 0;

    for (const b of bookings) {
      if (b.status === 'CONFIRMED') {
        confirmedCount++;
        ticketsSold += b.quantity;
        totalRevenue += Number(b.totalAmount);
      } else if (b.status === 'CANCELLED' || b.status === 'REFUNDED') {
        cancelledCount++;
      }
    }

    return {
      ticketsSold,
      remainingCapacity: event.remainingCapacity,
      totalCapacity: event.capacity,
      revenue: totalRevenue,
      bookingCount: bookings.length,
      confirmedBookings: confirmedCount,
      cancelledBookings: cancelledCount,
    };
  }
}

export const statsService = new StatsService();
