import { IdempotencyKey } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { CONSTANTS } from '../config/constants';

export class IdempotencyRepository {
  async findKey(key: string, userId: string): Promise<IdempotencyKey | null> {
    const record = await prisma.idempotencyKey.findUnique({
      where: {
        key_userId: {
          key,
          userId,
        },
      },
    });

    if (record && record.expiresAt < new Date()) {
      await this.deleteKey(key, userId);
      return null;
    }

    return record;
  }

  async saveKey(
    key: string,
    userId: string,
    path: string,
    statusCode: number,
    responseBody: any
  ): Promise<IdempotencyKey> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CONSTANTS.IDEMPOTENCY.EXPIRATION_HOURS);

    return prisma.idempotencyKey.create({
      data: {
        key,
        userId,
        path,
        statusCode,
        responseBody: JSON.stringify(responseBody),
        expiresAt,
      },
    });
  }

  async deleteKey(key: string, userId: string): Promise<void> {
    await prisma.idempotencyKey.deleteMany({
      where: {
        key,
        userId,
      },
    });
  }
}

export const idempotencyRepository = new IdempotencyRepository();
