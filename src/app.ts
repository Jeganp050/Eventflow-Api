import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { env } from './config/env';
import apiRouter from './routes';
import healthRouter from './routes/health.routes';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers with CSP configured to allow Swagger UI CDN/inline styles
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        },
      },
    })
  );

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // 3. Request Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Request Identification & Structured Logging
  app.use(requestIdMiddleware);
  app.use(requestLogger);

  // 5. Swagger / OpenAPI Documentation
  try {
    const openapiPath = path.resolve(__dirname, '../docs/openapi.yaml');
    const swaggerDocument = YAML.load(openapiPath);
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (err) {
    console.warn('Swagger YAML file could not be loaded for /docs endpoint');
  }

  // 6. Health Check (before rate limiting to avoid probe blocking)
  app.use('/health', healthRouter);

  // 7. Base API Router with Global Rate Limiting
  app.use(env.API_PREFIX, globalRateLimiter, apiRouter);

  // 8. Unmatched Route Handler (404)
  app.use(notFoundHandler);

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
