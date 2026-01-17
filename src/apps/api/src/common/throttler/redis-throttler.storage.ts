import { Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

type RedisThrottlerOptions = {
  host: string;
  port: number;
};

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(options: RedisThrottlerOptions) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      lazyConnect: true,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const keyName = `throttle:${throttlerName}:${key}`;
    const blockKey = `${keyName}:block`;

    try {
      const blockTtl = await this.client.pttl(blockKey);
      const isBlocked = blockTtl > 0;
      const currentHits = Number(await this.client.get(keyName)) || 0;

      if (isBlocked) {
        const timeToExpire = await this.getTimeToExpireSeconds(
          keyName,
          ttl,
        );
        return {
          totalHits: currentHits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockTtl / 1000),
        };
      }

      if (currentHits > limit) {
        await this.client.set(keyName, '0', 'PX', ttl);
      }

      const totalHits = await this.client.incr(keyName);
      const ttlMs = await this.ensureKeyTtl(keyName, ttl);

      if (totalHits > limit) {
        await this.client.set(blockKey, '1', 'PX', blockDuration);
        return {
          totalHits,
          timeToExpire: Math.ceil(ttlMs / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDuration / 1000),
        };
      }

      return {
        totalHits,
        timeToExpire: Math.ceil(ttlMs / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (error) {
      this.logger.error(
        `Redis throttler error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private async ensureKeyTtl(keyName: string, ttl: number): Promise<number> {
    const ttlMs = await this.client.pttl(keyName);
    if (ttlMs > 0) {
      return ttlMs;
    }
    await this.client.pexpire(keyName, ttl);
    return ttl;
  }

  private async getTimeToExpireSeconds(
    keyName: string,
    fallbackTtl: number,
  ): Promise<number> {
    const ttlMs = await this.client.pttl(keyName);
    const resolvedTtl = ttlMs > 0 ? ttlMs : fallbackTtl;
    return Math.ceil(resolvedTtl / 1000);
  }
}
