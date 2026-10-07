import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  bookingIdParamSchema,
  bookingQuerySchema,
} from '../validators/booking.validator';

const router = Router();

// All booking management endpoints require authentication
router.use(authenticate);

router.get('/', validate(bookingQuerySchema), bookingController.getUserBookings);
router.get('/:id', validate(bookingIdParamSchema), bookingController.getBookingById);
router.post('/:id/cancel', validate(bookingIdParamSchema), bookingController.cancelBooking);

export default router;
