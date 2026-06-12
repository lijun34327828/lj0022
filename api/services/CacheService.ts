import Redis from 'ioredis';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

export class CacheService {
  private redis: Redis | null = null;
  private useFallback: boolean = false;
  private fallbackCache: Map<string, { value: any; expiresAt: number }> = new Map();

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.useFallback = false;
      });

      this.redis.on('error', (error) => {
        logger.warn('Redis connection error, using fallback cache:', error.message);
        this.useFallback = true;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, using fallback cache');
      this.useFallback = true;
    }
  }

  private getAudioKey(taskId: string, segmentId?: string): string {
    return segmentId ? `cache:audio:${taskId}:${segmentId}` : `cache:audio:${taskId}`;
  }

  async setAudioCache(taskId: string, segmentId: string, audioData: Buffer, ttl?: number): Promise<void> {
    const key = this.getAudioKey(taskId, segmentId);
    const cacheTTL = ttl || config.cache.audioTTL;

    if (this.useFallback || !this.redis) {
      this.fallbackCache.set(key, {
        value: audioData.toString('base64'),
        expiresAt: Date.now() + cacheTTL * 1000,
      });
      return;
    }

    try {
      await this.redis.set(key, audioData.toString('base64'), 'EX', cacheTTL);
    } catch (error) {
      logger.error('Failed to set audio cache:', error);
      this.fallbackCache.set(key, {
        value: audioData.toString('base64'),
        expiresAt: Date.now() + cacheTTL * 1000,
      });
    }
  }

  async getAudioCache(taskId: string, segmentId: string): Promise<Buffer | null> {
    const key = this.getAudioKey(taskId, segmentId);

    if (this.useFallback || !this.redis) {
      const cached = this.fallbackCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return Buffer.from(cached.value, 'base64');
      }
      this.fallbackCache.delete(key);
      return null;
    }

    try {
      const data = await this.redis.get(key);
      return data ? Buffer.from(data, 'base64') : null;
    } catch (error) {
      logger.error('Failed to get audio cache:', error);
      const cached = this.fallbackCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return Buffer.from(cached.value, 'base64');
      }
      return null;
    }
  }

  async deleteAudioCache(taskId: string, segmentId?: string): Promise<void> {
    const key = this.getAudioKey(taskId, segmentId);

    if (this.useFallback || !this.redis) {
      this.fallbackCache.delete(key);
      return;
    }

    try {
      if (segmentId) {
        await this.redis.del(key);
      } else {
        const keys = await this.redis.keys(`cache:audio:${taskId}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      logger.error('Failed to delete audio cache:', error);
    }
  }

  async setTaskStatus(taskId: string, status: string, data?: any): Promise<void> {
    const key = `task:status:${taskId}`;

    if (this.useFallback || !this.redis) {
      this.fallbackCache.set(key, {
        value: JSON.stringify({ status, data }),
        expiresAt: Date.now() + 3600 * 1000,
      });
      return;
    }

    try {
      await this.redis.set(key, JSON.stringify({ status, data }), 'EX', 3600);
    } catch (error) {
      logger.error('Failed to set task status:', error);
    }
  }

  async getTaskStatus(taskId: string): Promise<{ status: string; data?: any } | null> {
    const key = `task:status:${taskId}`;

    if (this.useFallback || !this.redis) {
      const cached = this.fallbackCache.get(key);
      if (cached) {
        return JSON.parse(cached.value);
      }
      return null;
    }

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get task status:', error);
      return null;
    }
  }

  async clearExpired(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of this.fallbackCache.entries()) {
      if (value.expiresAt < now) {
        this.fallbackCache.delete(key);
      }
    }
  }

  disconnect(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

export default new CacheService();
