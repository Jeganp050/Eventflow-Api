import { BookingService } from '../../src/services/booking.service';
import { AppError } from '../../src/errors/app.error';
import { BookingStatus, Role } from '../../src/types';

describe('BookingService (Unit Tests)', () => {
  let bookingService: BookingService;
  let mockBookingRepo: any;
  let mockEventRepo: any;
  let mockIdempotencyRepo: any;
  let mockCache: any;
  let mockEmail: any;

  beforeEach(() => {
    mockBookingRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      createBookingWithAtomicCapacityDecrement: jest.fn(),
      cancelBookingWithAtomicCapacityIncrement: jest.fn(),
    };
    mockEventRepo = {
      findById: jest.fn(),
    };
    mockIdempotencyRepo = {
      findKey: jest.fn(),
      saveKey: jest.fn(),
    };
    mockCache = {
      del: jest.fn(),
      invalidateByPattern: jest.fn(),
    };
    mockEmail = {
      sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
      sendCancellationNotification: jest.fn().mockResolvedValue(undefined),
    };

    bookingService = new BookingService(
      mockBookingRepo,
      mockEventRepo,
      mockIdempotencyRepo,
      mockCache,
      mockEmail
    );
  });

  describe('createBooking', () => {
    it('should return cached response if idempotency key is already recorded', async () => {
      const cachedBooking = { id: 'booking-1', quantity: 2, status: 'CONFIRMED' };
      mockIdempotencyRepo.findKey.mockResolvedValue({
        responseBody: JSON.stringify(cachedBooking),
      });

      const result = await bookingService.createBooking(
        'user-1',
        'user@example.com',
        'User',
        'event-1',
        2,
        'idempotent-key-123'
      );

      expect(result.isIdempotentReplay).toBe(true);
      expect(result.booking.id).toBe('booking-1');
      expect(mockBookingRepo.createBookingWithAtomicCapacityDecrement).not.toHaveBeenCalled();
    });

    it('should proceed to create booking and send confirmation when idempotency key is new', async () => {
      mockIdempotencyRepo.findKey.mockResolvedValue(null);
      const createdBooking = { id: 'booking-2', quantity: 2, totalAmount: 200, status: 'CONFIRMED' };
      mockBookingRepo.createBookingWithAtomicCapacityDecrement.mockResolvedValue(createdBooking);
      mockEventRepo.findById.mockResolvedValue({
        id: 'event-1',
        title: 'Tech Summit',
        startTime: new Date(),
        venue: 'Main Hall',
        city: 'Bengaluru',
      });

      const result = await bookingService.createBooking(
        'user-1',
        'user@example.com',
        'User',
        'event-1',
        2,
        'new-key-456'
      );

      expect(result.isIdempotentReplay).toBe(false);
      expect(result.booking.id).toBe('booking-2');
      expect(mockBookingRepo.createBookingWithAtomicCapacityDecrement).toHaveBeenCalledWith('user-1', 'event-1', 2);
      expect(mockIdempotencyRepo.saveKey).toHaveBeenCalled();
    });
  });

  describe('cancelBooking', () => {
    it('should reject cancellation if user is not the booking owner', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        id: 'booking-1',
        userId: 'different-user',
        status: BookingStatus.CONFIRMED,
        event: {
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await expect(
        bookingService.cancelBooking('booking-1', 'user-1')
      ).rejects.toThrow(AppError);
    });

    it('should reject cancellation if cancellation window has expired', async () => {
      // Event starts in 30 minutes (less than default 2-hour window)
      mockBookingRepo.findById.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-1',
        status: BookingStatus.CONFIRMED,
        event: {
          startTime: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      await expect(
        bookingService.cancelBooking('booking-1', 'user-1')
      ).rejects.toThrow(AppError);
    });
  });
});
