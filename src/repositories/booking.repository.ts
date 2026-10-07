import { Booking, Prisma, BookingStatus, EventStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';

export class BookingRepository {
  async findById(id: string): Promise<(Booking & { event: any; user: any }) | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    skip: number,
    take: number,
    status?: BookingStatus
  ): Promise<{ bookings: Booking[]; total: number }> {
    const where: Prisma.BookingWhereInput = {
      userId,
      ...(status ? { status } : {}),
    };

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              venue: true,
              city: true,
              status: true,
              price: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total };
  }

  async findByEventId(eventId: string): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Atomic concurrency-safe ticket reservation and booking creation.
   * Uses Prisma transaction with conditional atomic update to eliminate race conditions.
   */
  async createBookingWithAtomicCapacityDecrement(
    userId: string,
    eventId: string,
    quantity: number
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // 1. First fetch event to check existence, status, price, and current timing
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
      }

      if (event.status === EventStatus.CANCELLED) {
        throw AppError.conflict('Cannot book tickets for a cancelled event', ErrorCode.EVENT_ALREADY_CANCELLED);
      }

      if (event.status === EventStatus.COMPLETED) {
        throw AppError.conflict('Cannot book tickets for a completed event', ErrorCode.EVENT_ALREADY_COMPLETED);
      }

      if (new Date(event.startTime) <= new Date()) {
        throw AppError.badRequest('Cannot book tickets for an event that has already started', ErrorCode.EVENT_ALREADY_STARTED);
      }

      // 2. Perform conditional atomic seat decrement
      // Only decrements if status is UPCOMING and remainingCapacity >= requested quantity
      const updateResult = await tx.$executeRaw`
        UPDATE "Event"
        SET "remainingCapacity" = "remainingCapacity" - ${quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${eventId}
          AND "remainingCapacity" >= ${quantity}
          AND "status" = 'UPCOMING'
      `;

      if (updateResult === 0) {
        // Since event was confirmed UPCOMING and not started above, failure means insufficient seats
        throw AppError.conflict(
          `Not enough seats available. Requested: ${quantity}, Remaining: ${event.remainingCapacity}`,
          ErrorCode.INSUFFICIENT_CAPACITY
        );
      }

      // 3. Calculate total amount
      const totalAmount = Number(event.price) * quantity;

      // 4. Create the booking record inside the same atomic transaction
      const booking = await tx.booking.create({
        data: {
          userId,
          eventId,
          quantity,
          totalAmount,
          status: BookingStatus.CONFIRMED,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              venue: true,
              city: true,
              price: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return booking;
    });
  }

  /**
   * Atomic booking cancellation and seat restoration.
   */
  async cancelBookingWithAtomicCapacityIncrement(
    bookingId: string
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch booking with current status
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { event: true },
      });

      if (!booking) {
        throw AppError.notFound('Booking not found', ErrorCode.BOOKING_NOT_FOUND);
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw AppError.badRequest('Booking has already been cancelled', ErrorCode.BOOKING_ALREADY_CANCELLED);
      }

      // 2. Atomically update booking status to CANCELLED ensuring status was CONFIRMED
      const updateBookingResult = await tx.booking.updateMany({
        where: {
          id: bookingId,
          status: BookingStatus.CONFIRMED,
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      if (updateBookingResult.count === 0) {
        throw AppError.badRequest('Booking has already been cancelled or modified', ErrorCode.BOOKING_ALREADY_CANCELLED);
      }

      // 3. Atomically restore seats to the event
      await tx.$executeRaw`
        UPDATE "Event"
        SET "remainingCapacity" = "remainingCapacity" + ${booking.quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${booking.eventId}
      `;

      // 4. Return the updated booking
      const updatedBooking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              venue: true,
              city: true,
            },
          },
        },
      });

      return updatedBooking!;
    });
  }

  /**
   * Bulk cancel bookings when an organizer cancels an event
   */
  async cancelAllBookingsForEvent(
    eventId: string,
    tx: Prisma.TransactionClient
  ): Promise<number> {
    const result = await tx.booking.updateMany({
      where: {
        eventId,
        status: BookingStatus.CONFIRMED,
      },
      data: {
        status: BookingStatus.REFUNDED,
        cancelledAt: new Date(),
      },
    });

    return result.count;
  }
}

export const bookingRepository = new BookingRepository();
