import { Booking, BookingStatus, Role } from '@prisma/client';
import { bookingRepository, BookingRepository } from '../repositories/booking.repository';
import { eventRepository, EventRepository } from '../repositories/event.repository';
import { idempotencyRepository, IdempotencyRepository } from '../repositories/idempotency.repository';
import { cacheAdapter, CacheAdapter } from '../integrations/cache.adapter';
import { emailAdapter, EmailAdapter } from '../integrations/email.adapter';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';
import { env } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { PaginationMeta } from '../types';

export class BookingService {
  constructor(
    private bookingRepo: BookingRepository = bookingRepository,
    private eventRepo: EventRepository = eventRepository,
    private idempotencyRepo: IdempotencyRepository = idempotencyRepository,
    private cache: CacheAdapter = cacheAdapter,
    private email: EmailAdapter = emailAdapter
  ) {}

  async createBooking(
    userId: string,
    userEmail: string,
    userName: string,
    eventId: string,
    quantity: number,
    idempotencyKey?: string
  ): Promise<{ booking: Booking; isIdempotentReplay?: boolean }> {
    // 1. Check Idempotency Key if provided
    if (idempotencyKey) {
      const existingKey = await this.idempotencyRepo.findKey(idempotencyKey, userId);
      if (existingKey) {
        return {
          booking: JSON.parse(existingKey.responseBody),
          isIdempotentReplay: true,
        };
      }
    }

    // 2. Perform atomic, transaction-safe booking reservation
    const booking = await this.bookingRepo.createBookingWithAtomicCapacityDecrement(
      userId,
      eventId,
      quantity
    );

    // 3. Invalidate event cache so fresh remainingCapacity is immediately reflected
    await this.cache.del(`${CONSTANTS.CACHE.EVENT_DETAIL_KEY_PREFIX}:${eventId}`);
    await this.cache.invalidateByPattern(`${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}*`);

    // 4. Save Idempotency response if key was provided
    if (idempotencyKey) {
      await this.idempotencyRepo.saveKey(
        idempotencyKey,
        userId,
        `/api/v1/events/${eventId}/bookings`,
        201,
        booking
      );
    }

    // 5. Trigger mock confirmation email asynchronously
    const event = await this.eventRepo.findById(eventId);
    if (event) {
      this.email
        .sendBookingConfirmation({
          to: userEmail,
          userName: userName,
          eventTitle: event.title,
          quantity: booking.quantity,
          totalAmount: Number(booking.totalAmount),
          bookingId: booking.id,
          eventStartTime: event.startTime,
          eventVenue: `${event.venue}, ${event.city}`,
        })
        .catch(() => {});
    }

    return { booking, isIdempotentReplay: false };
  }

  async getBookingById(
    bookingId: string,
    userId: string,
    userRole: Role
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw AppError.notFound('Booking not found', ErrorCode.BOOKING_NOT_FOUND);
    }

    // Authorization check: User can view if they are the attendee who booked,
    // or if they are the organizer who created the event
    const isOwner = booking.userId === userId;
    const isEventOrganizer = userRole === Role.ORGANIZER && booking.event?.organizerId === userId;

    if (!isOwner && !isEventOrganizer) {
      throw AppError.forbidden('You do not have permission to view this booking', ErrorCode.AUTH_FORBIDDEN);
    }

    return booking;
  }

  async getUserBookings(
    userId: string,
    page: number = CONSTANTS.PAGINATION.DEFAULT_PAGE,
    limit: number = CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    status?: BookingStatus
  ): Promise<{ bookings: Booking[]; pagination: PaginationMeta }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(limit, CONSTANTS.PAGINATION.MAX_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const { bookings, total } = await this.bookingRepo.findByUserId(
      userId,
      skip,
      safeLimit,
      status
    );

    return {
      bookings,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  }

  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw AppError.notFound('Booking not found', ErrorCode.BOOKING_NOT_FOUND);
    }

    // Authorization: only the user who made the booking can cancel it
    if (booking.userId !== userId) {
      throw AppError.forbidden('You can only cancel your own bookings', ErrorCode.BOOKING_NOT_OWNED);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw AppError.badRequest('Booking has already been cancelled', ErrorCode.BOOKING_ALREADY_CANCELLED);
    }

    // Cancellation window rule: Check deadline
    const event = booking.event;
    const deadlineHours = env.CANCELLATION_DEADLINE_HOURS;
    const eventStartTime = new Date(event.startTime).getTime();
    const cancellationDeadline = eventStartTime - deadlineHours * 60 * 60 * 1000;
    const now = Date.now();

    if (now > cancellationDeadline) {
      throw AppError.badRequest(
        `Cancellation window has expired. Bookings can only be cancelled at least ${deadlineHours} hours before the event starts.`,
        ErrorCode.CANCELLATION_WINDOW_EXPIRED
      );
    }

    // Atomic cancellation and seat restoration
    const updatedBooking = await this.bookingRepo.cancelBookingWithAtomicCapacityIncrement(bookingId);

    // Invalidate event caches
    await this.cache.del(`${CONSTANTS.CACHE.EVENT_DETAIL_KEY_PREFIX}:${booking.eventId}`);
    await this.cache.invalidateByPattern(`${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}*`);

    // Trigger mock cancellation email
    this.email
      .sendCancellationNotification({
        to: booking.user?.email,
        userName: booking.user?.name,
        eventTitle: event.title,
        quantity: booking.quantity,
        bookingId: booking.id,
      })
      .catch(() => {});

    return updatedBooking;
  }
}

export const bookingService = new BookingService();
