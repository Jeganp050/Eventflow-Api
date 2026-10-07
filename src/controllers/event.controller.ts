import { Request, Response, NextFunction } from 'express';
import { eventService, EventService } from '../services/event.service';
import { statsService, StatsService } from '../services/stats.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.utils';

export class EventController {
  constructor(
    private eventServiceInstance: EventService = eventService,
    private statsServiceInstance: StatsService = statsService
  ) {}

  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventServiceInstance.getEvents(req.query as any);
      return sendSuccess(res, result.events, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  };

  getEventById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const event = await this.eventServiceInstance.getEventById(id);
      return sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  };

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizerId = req.user!.sub;
      const event = await this.eventServiceInstance.createEvent(organizerId, req.body);
      return sendCreated(res, event);
    } catch (error) {
      next(error);
    }
  };

  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizerId = req.user!.sub;
      const updated = await this.eventServiceInstance.updateEvent(id, organizerId, req.body);
      return sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizerId = req.user!.sub;
      await this.eventServiceInstance.deleteEvent(id, organizerId);
      return sendNoContent(res);
    } catch (error) {
      next(error);
    }
  };

  cancelEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizerId = req.user!.sub;
      const cancelled = await this.eventServiceInstance.cancelEvent(id, organizerId);
      return sendSuccess(res, cancelled);
    } catch (error) {
      next(error);
    }
  };

  getEventBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizerId = req.user!.sub;
      const bookings = await this.statsServiceInstance.getEventBookings(id, organizerId);
      return sendSuccess(res, bookings);
    } catch (error) {
      next(error);
    }
  };

  getEventStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizerId = req.user!.sub;
      const stats = await this.statsServiceInstance.getEventStats(id, organizerId);
      return sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  };
}

export const eventController = new EventController();
