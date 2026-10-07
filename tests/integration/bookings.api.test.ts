import request from 'supertest';
import { app } from '../../src/app';
import { generateAccessToken } from '../../src/utils/jwt.utils';
import { Role } from '../../src/types';

describe('Bookings API (Integration)', () => {
  const attendeeToken = generateAccessToken({
    sub: 'attendee-uuid-1',
    role: Role.ATTENDEE,
    email: 'attendee1@eventflow.dev',
  });

  describe('POST /api/v1/events/:id/bookings', () => {
    it('should reject booking request without auth token (401)', async () => {
      const res = await request(app)
        .post('/api/v1/events/550e8400-e29b-41d4-a716-446655440000/bookings')
        .send({ quantity: 2 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should validate quantity bounds (quantity > MAX_TICKETS_PER_BOOKING)', async () => {
      const res = await request(app)
        .post('/api/v1/events/550e8400-e29b-41d4-a716-446655440000/bookings')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({ quantity: 10 }); // Exceeds default limit of 5

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-positive quantity', async () => {
      const res = await request(app)
        .post('/api/v1/events/550e8400-e29b-41d4-a716-446655440000/bookings')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
