import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger.utils';

export class CacheAdapter {
  private redisClient: Redis | null = null;
  private memoryCache: Map<string, { value: string; expiry: number }> = new Map();
  private isRedisConnected: boolean = false;

  constructor() {
    if (env.REDIS_URL) {
      try {
        this.redisClient = new Redis(env.REDIS_URL, {
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis reconnection stopped; falling back to in-memory cache');
              return null;
            }
            return Math.min(times * 100, 2000);
          },
        });

        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('Connected to Redis server');
        });

        this.redisClient.on('error', (err) => {
          this.isRedisConnected = false;
          logger.warn(`Redis connection error: ${err.message}. Operating with in-memory fallback.`);
        });

        this.redisClient.connect().catch((err) => {
          logger.warn(`Redis initial connection failed: ${err.message}. Using in-memory fallback.`);
        });
      } catch (err: any) {
        logger.warn(`Failed to initialize Redis: ${err.message}. Using memory cache.`);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(data) : null;
      }

      // Memory cache fallback
      const cached = this.memoryCache.get(key);
      if (cached) {
        if (cached.expiry > Date.now()) {
          return JSON.parse(cached.value);
        }
        this.memoryCache.delete(key);
      }
      return null;
    } catch (err: any) {
      logger.warn(`Cache get error for key [${key}]: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.set(key, stringValue, 'EX', ttlSeconds);
        return;
      }

      // Memory cache fallback
      this.memoryCache.set(key, {
        value: stringValue,
        expiry: Date.now() + ttlSeconds * 1000,
      });
    } catch (err: any) {
      logger.warn(`Cache set error for key [${key}]: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }
      this.memoryCache.delete(key);
    } catch (err: any) {
      logger.warn(`Cache delete error for key [${key}]: ${err.message}`);
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      // Invalidate memory cache keys matching prefix/pattern
      const prefix = pattern.replace('*', '');
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (err: any) {
      logger.warn(`Cache invalidation error for pattern [${pattern}]: ${err.message}`);
    }
  }

  async flush(): Promise<void> {
    this.memoryCache.clear();
    if (this.isRedisConnected && this.redisClient) {
      await this.redisClient.flushdb();
    }
  }
}

export const cacheAdapter = new CacheAdapter();
