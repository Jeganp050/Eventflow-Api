import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  BOOKING_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('15'),
  MAX_TICKETS_PER_BOOKING: z.string().transform(Number).default('5'),
  CANCELLATION_DEADLINE_HOURS: z.string().transform(Number).default('2'),
  REDIS_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  // In test environment, provide fallback or exit
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      NODE_ENV: (process.env.NODE_ENV as any) || 'test',
      PORT: Number(process.env.PORT) || 3000,
      API_PREFIX: process.env.API_PREFIX || '/api/v1',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eventflow_test?schema=public',
      JWT_SECRET: process.env.JWT_SECRET || 'super-secret-test-jwt-secret-at-least-32-chars',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super-secret-test-jwt-refresh-secret-at-least-32-chars',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
      BOOKING_RATE_LIMIT_MAX: Number(process.env.BOOKING_RATE_LIMIT_MAX) || 10,
      AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX) || 15,
      MAX_TICKETS_PER_BOOKING: Number(process.env.MAX_TICKETS_PER_BOOKING) || 5,
      CANCELLATION_DEADLINE_HOURS: Number(process.env.CANCELLATION_DEADLINE_HOURS) || 2,
      REDIS_URL: process.env.REDIS_URL,
    };
