import { Event, Prisma, EventStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { EventFilterQuery } from '../types';

export class EventRepository {
  async create(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
    return prisma.event.create({ data });
  }

  async findById(id: string): Promise<Event | null> {
    return prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return prisma.event.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Event> {
    return prisma.event.delete({
      where: { id },
    });
  }

  async findManyWithFilters(
    filters: EventFilterQuery,
    skip: number,
    take: number
  ): Promise<{ events: Event[]; total: number }> {
    const where: Prisma.EventWhereInput = {};

    if (filters.category) {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters.city) {
      where.city = { equals: filters.city, mode: 'insensitive' };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startTime.lte = new Date(filters.endDate);
      }
    }

    if (filters.availableOnly) {
      where.remainingCapacity = { gt: 0 };
      where.status = EventStatus.UPCOMING;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { venue: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.EventOrderByWithRelationInput = {};
    const sortField = filters.sort || 'startTime';
    const sortOrder = filters.order || 'asc';
    (orderBy as any)[sortField] = sortOrder;

    const [events, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total };
  }

  async findByOrganizerId(organizerId: string): Promise<Event[]> {
    return prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: EventStatus, tx?: Prisma.TransactionClient): Promise<Event> {
    const client = tx || prisma;
    return client.event.update({
      where: { id },
      data: { status },
    });
  }
}

export const eventRepository = new EventRepository();
