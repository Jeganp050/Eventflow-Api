import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger.utils';
import { prisma } from './utils/prisma';
import { eventStatusUpdaterJob } from './jobs/eventStatusUpdater.job';

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 EventFlow API Server is running on port ${PORT}`);
  logger.info(`📚 Swagger Documentation available at http://localhost:${PORT}/docs`);
  logger.info(`🩺 Health check endpoint available at http://localhost:${PORT}/health`);

  // Start background periodic event status updater
  eventStatusUpdaterJob.start();
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop background jobs
  eventStatusUpdaterJob.stop();

  // Stop receiving new connections
  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      // Disconnect Prisma
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force close if graceful shutdown takes too long (10 seconds timeout)
  setTimeout(() => {
    logger.error('Forcing server shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection detected:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception detected:', error);
  process.exit(1);
});
