import { redisClient } from "./client";

export class CacheService {
  public async get(key: string): Promise<string | null> {
    return redisClient.get(key);
  }

  public async set(key: string, value: string, ttl = 3600): Promise<void> {
    await redisClient.set(key, value, {
      expiration: {
        type: 'EX',
        value: ttl * 1000, // milliseconds
      }
    });
  }

  public async delete(key: string): Promise<void> {
    await redisClient.del(key);
  }
}