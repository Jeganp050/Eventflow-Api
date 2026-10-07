import { Event, EventStatus } from '@prisma/client';
import { eventRepository, EventRepository } from '../repositories/event.repository';
import { bookingRepository, BookingRepository } from '../repositories/booking.repository';
import { cacheAdapter, CacheAdapter } from '../integrations/cache.adapter';
import { emailAdapter, EmailAdapter } from '../integrations/email.adapter';
import { prisma } from '../utils/prisma';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';
import { CreateEventInput, UpdateEventInput, EventQueryParams } from '../validators/event.validator';
import { CONSTANTS } from '../config/constants';
import { PaginationMeta } from '../types';

export class EventService {
  constructor(
    private eventRepo: EventRepository = eventRepository,
    private bookingRepo: BookingRepository = bookingRepository,
    private cache: CacheAdapter = cacheAdapter,
    private email: EmailAdapter = emailAdapter
  ) {}

  async createEvent(organizerId: string, input: CreateEventInput): Promise<Event> {
    const event = await this.eventRepo.create({
      organizerId,
      title: input.title,
      description: input.description,
      category: input.category,
      city: input.city,
      venue: input.venue,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      capacity: input.capacity,
      remainingCapacity: input.capacity,
      price: input.price,
      status: EventStatus.UPCOMING,
    });

    // Invalidate public event list cache
    await this.cache.invalidateByPattern(`${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}*`);

    return event;
  }

  async getEventById(id: string): Promise<Event> {
    const cacheKey = `${CONSTANTS.CACHE.EVENT_DETAIL_KEY_PREFIX}:${id}`;
    const cached = await this.cache.get<Event>(cacheKey);
    if (cached) {
      return cached;
    }

    const event = await this.eventRepo.findById(id);
    if (!event) {
      throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
    }

    await this.cache.set(cacheKey, event, CONSTANTS.CACHE.DEFAULT_TTL_SECONDS);
    return event;
  }

  async getEvents(
    params: EventQueryParams
  ): Promise<{ events: Event[]; pagination: PaginationMeta }> {
    const page = Math.max(1, params.page || CONSTANTS.PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      params.limit || CONSTANTS.PAGINATION.DEFAULT_LIMIT,
      CONSTANTS.PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const cacheKey = `${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}:${JSON.stringify(params)}`;
    const cached = await this.cache.get<{ events: Event[]; pagination: PaginationMeta }>(cacheKey);
    if (cached) {
      return cached;
    }

    const { events, total } = await this.eventRepo.findManyWithFilters(params, skip, limit);

    const totalPages = Math.ceil(total / limit) || 1;
    const result = {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    await this.cache.set(cacheKey, result, CONSTANTS.CACHE.DEFAULT_TTL_SECONDS);
    return result;
  }

  async updateEvent(
    eventId: string,
    organizerId: string,
    input: UpdateEventInput
  ): Promise<Event> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
    }

    // Role-based ownership check
    if (event.organizerId !== organizerId) {
      throw AppError.forbidden('You do not have permission to modify this event', ErrorCode.EVENT_NOT_OWNED);
    }

    if (event.status === EventStatus.CANCELLED) {
      throw AppError.badRequest('Cannot modify a cancelled event', ErrorCode.EVENT_ALREADY_CANCELLED);
    }

    if (event.status === EventStatus.COMPLETED) {
      throw AppError.badRequest('Cannot modify a completed event', ErrorCode.EVENT_ALREADY_COMPLETED);
    }

    const updateData: any = {};
    if (input.title) updateData.title = input.title;
    if (input.description) updateData.description = input.description;
    if (input.category) updateData.category = input.category;
    if (input.city) updateData.city = input.city;
    if (input.venue) updateData.venue = input.venue;
    if (input.startTime) updateData.startTime = new Date(input.startTime);
    if (input.endTime) updateData.endTime = new Date(input.endTime);
    if (input.price !== undefined) updateData.price = input.price;
    if (input.status) updateData.status = input.status;

    // Capacity adjustment logic:
    if (input.capacity !== undefined) {
      const ticketsSold = event.capacity - event.remainingCapacity;
      if (input.capacity < ticketsSold) {
        throw AppError.badRequest(
          `Cannot reduce capacity to ${input.capacity}. There are already ${ticketsSold} confirmed tickets booked.`,
          ErrorCode.EVENT_CANNOT_REDUCE_CAPACITY_BELOW_BOOKED
        );
      }
      const capacityDifference = input.capacity - event.capacity;
      updateData.capacity = input.capacity;
      updateData.remainingCapacity = event.remainingCapacity + capacityDifference;
    }

    const updated = await this.eventRepo.update(eventId, updateData);

    // Invalidate caches
    await this.cache.del(`${CONSTANTS.CACHE.EVENT_DETAIL_KEY_PREFIX}:${eventId}`);
    await this.cache.invalidateByPattern(`${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}*`);

    return updated;
  }

  async deleteEvent(eventId: string, organizerId: string): Promise<void> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
    }

    if (event.organizerId !== organizerId) {
      throw AppError.forbidden('You do not have permission to delete this event', ErrorCode.EVENT_NOT_OWNED);
    }

    const bookings = await this.bookingRepo.findByEventId(eventId);
    const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED');

    if (activeBookings.length > 0) {
      throw AppError.badRequest(
        'Cannot delete event with active bookings. Cancel the event instead.',
        ErrorCode.BAD_REQUEST
      );
    }

    await this.eventRepo.delete(eventId);

    await this.cache.del(`${CONSTANTS.CACHE.EVENT_DETAIL_KEY_PREFIX}:${eventId}`);
    await this.cache.invalidateByPattern(`${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}*`);
  }

  async cancelEvent(eventId: string, organizerId: string): Promise<Event> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw AppError.notFound('Event not found', ErrorCode.EVENT_NOT_FOUND);
    }

    if (event.organizerId !== organizerId) {
      throw AppError.forbidden('You do not have permission to cancel this event', ErrorCode.EVENT_NOT_OWNED);
    }

    if (event.status === EventStatus.CANCELLED) {
      throw AppError.badRequest('Event is already cancelled', ErrorCode.EVENT_ALREADY_CANCELLED);
    }

    // Execute event cancellation and booking refunds in a single transaction
    const updatedEvent = await prisma.$transaction(async (tx) => {
      const cancelled = await this.eventRepo.updateStatus(eventId, EventStatus.CANCELLED, tx);
      await this.bookingRepo.cancelAllBookingsForEvent(eventId, tx);
      return cancelled;
    });

    // Notify affected attendees asynchronously
    const bookings = await this.bookingRepo.findByEventId(eventId);
    const attendeeEmails = Array.from(new Set(bookings.map((b: any) => b.user?.email).filter(Boolean)));
    this.email.sendEventCancelledNotification(attendeeEmails, event.title).catch(() => {});

    // Invalidate caches
    await this.cache.del(`${CONSTANTS.CACHE.EVENT_DETAIL_KEY_PREFIX}:${eventId}`);
    await this.cache.invalidateByPattern(`${CONSTANTS.CACHE.EVENT_LIST_KEY_PREFIX}*`);

    return updatedEvent;
  }
}

export const eventService = new EventService();
