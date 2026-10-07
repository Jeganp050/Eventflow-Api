import request from 'supertest';
import { app } from '../../src/app';
import { generateAccessToken } from '../../src/utils/jwt.utils';
import { Role } from '../../src/types';

describe('Events API (Integration)', () => {
  const attendeeToken = generateAccessToken({
    sub: 'attendee-uuid',
    role: Role.ATTENDEE,
    email: 'attendee@eventflow.dev',
  });

  const organizerToken = generateAccessToken({
    sub: 'organizer-uuid',
    role: Role.ORGANIZER,
    email: 'organizer@eventflow.dev',
  });

  describe('GET /api/v1/events', () => {
    it('should validate query parameters format', async () => {
      const res = await request(app).get('/api/v1/events?limit=invalid');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/events (RBAC Authorization)', () => {
    it('should block ATTENDEE from creating events with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          title: 'Unauthorized Event',
          description: 'Attendee trying to create an event',
          category: 'Music',
          city: 'Mumbai',
          venue: 'Test Stadium',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 172800000).toISOString(),
          capacity: 100,
          price: 500,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
    });

    it('should block unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .send({
          title: 'Unauthenticated Event',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });
  });
});
