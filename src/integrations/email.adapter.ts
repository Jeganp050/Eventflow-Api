import { logger } from '../utils/logger.utils';

export interface BookingEmailPayload {
  to: string;
  userName: string;
  eventTitle: string;
  quantity: number;
  totalAmount: number;
  bookingId: string;
  eventStartTime: Date;
  eventVenue: string;
}

export interface CancellationEmailPayload {
  to: string;
  userName: string;
  eventTitle: string;
  quantity: number;
  bookingId: string;
  refundAmount?: number;
}

export class EmailAdapter {
  async sendBookingConfirmation(payload: BookingEmailPayload): Promise<void> {
    // Production mock adapter: logs clear transactional confirmation details without sending real outbound mail
    logger.info(`[MOCK EMAIL SERVICE] Booking confirmation sent to ${payload.to}`, {
      recipient: payload.to,
      subject: `Booking Confirmed for ${payload.eventTitle}`,
      bookingId: payload.bookingId,
      quantity: payload.quantity,
      totalAmount: payload.totalAmount,
    });
  }

  async sendCancellationNotification(payload: CancellationEmailPayload): Promise<void> {
    logger.info(`[MOCK EMAIL SERVICE] Booking cancellation email sent to ${payload.to}`, {
      recipient: payload.to,
      subject: `Booking Cancelled for ${payload.eventTitle}`,
      bookingId: payload.bookingId,
      quantity: payload.quantity,
    });
  }

  async sendEventCancelledNotification(attendeeEmails: string[], eventTitle: string): Promise<void> {
    for (const email of attendeeEmails) {
      logger.info(`[MOCK EMAIL SERVICE] Event cancellation notice sent to ${email}`, {
        recipient: email,
        subject: `Event Cancelled: ${eventTitle}`,
      });
    }
  }
}

export const emailAdapter = new EmailAdapter();
