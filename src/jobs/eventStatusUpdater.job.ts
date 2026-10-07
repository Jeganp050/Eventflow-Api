import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger.utils';
import { EventStatus } from '@prisma/client';

export class EventStatusUpdaterJob {
  private task: cron.ScheduledTask | null = null;

  async updateStatuses(): Promise<{ liveCount: number; completedCount: number }> {
    const now = new Date();

    // 1. Transition UPCOMING -> LIVE if startTime has passed and endTime is in the future
    const liveResult = await prisma.event.updateMany({
      where: {
        status: EventStatus.UPCOMING,
        startTime: { lte: now },
        endTime: { gt: now },
      },
      data: {
        status: EventStatus.LIVE,
      },
    });

    // 2. Transition UPCOMING/LIVE -> COMPLETED if endTime has passed
    const completedResult = await prisma.event.updateMany({
      where: {
        status: { in: [EventStatus.UPCOMING, EventStatus.LIVE] },
        endTime: { lte: now },
      },
      data: {
        status: EventStatus.COMPLETED,
      },
    });

    if (liveResult.count > 0 || completedResult.count > 0) {
      logger.info('Event status update job completed', {
        transitionedToLive: liveResult.count,
        transitionedToCompleted: completedResult.count,
      });
    }

    return {
      liveCount: liveResult.count,
      completedCount: completedResult.count,
    };
  }

  start(cronExpression: string = '*/1 * * * *') {
    // Run initial update immediately on server start
    this.updateStatuses().catch((err) => {
      logger.error('Failed to run initial event status update:', err);
    });

    // Schedule periodic job
    this.task = cron.schedule(cronExpression, async () => {
      try {
        await this.updateStatuses();
      } catch (err) {
        logger.error('Error during scheduled event status update:', err);
      }
    });

    logger.info(`Event status updater cron job started with schedule: ${cronExpression}`);
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Event status updater cron job stopped');
    }
  }
}

export const eventStatusUpdaterJob = new EventStatusUpdaterJob();
