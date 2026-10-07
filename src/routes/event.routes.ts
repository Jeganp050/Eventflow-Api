import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { bookingRateLimiter } from '../middleware/rateLimiter.middleware';
import { Role } from '../types';
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
  eventIdParamSchema,
} from '../validators/event.validator';
import { createBookingSchema } from '../validators/booking.validator';

const router = Router();

// Public routes
router.get('/', validate(eventQuerySchema), eventController.getEvents);
router.get('/:id', validate(eventIdParamSchema), eventController.getEventById);

// Organizer-only event management routes
router.post(
  '/',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(createEventSchema),
  eventController.createEvent
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(updateEventSchema),
  eventController.updateEvent
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(eventIdParamSchema),
  eventController.deleteEvent
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(eventIdParamSchema),
  eventController.cancelEvent
);

router.get(
  '/:id/bookings',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(eventIdParamSchema),
  eventController.getEventBookings
);

router.get(
  '/:id/stats',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(eventIdParamSchema),
  eventController.getEventStats
);

// Booking creation under event resource
router.post(
  '/:id/bookings',
  authenticate,
  bookingRateLimiter,
  validate(createBookingSchema),
  bookingController.createBooking
);

export default router;
