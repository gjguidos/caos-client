import { logger } from "@/shared/lib/logger";
import Redis, { Command } from "ioredis";

declare global {
  var _redisClientInstance: Redis | undefined;
}

function getRedisClient(): Redis {
  if (globalThis._redisClientInstance) return globalThis._redisClientInstance!;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL environment variable is required for production"
    );
  }

  const client = new Redis(redisUrl, {
    enableAutoPipelining: true,
    retryStrategy: (times) => Math.min(2000, times * 200), // cap at 2s
    maxRetriesPerRequest: 20,
    lazyConnect: true,
    connectTimeout: 15_000,
    enableReadyCheck: true,
  });

  client.on("error", (err) => {
    logger.error("Redis connection error:", err?.message || err);
  });

  // Define atomic GET+DEL (cached SHA by ioredis)
  client.defineCommand("getdel_compat", {
    numberOfKeys: 1,
    lua: `
      local v = redis.call('GET', KEYS[1])
      if v ~= false and v ~= nil then
        redis.call('DEL', KEYS[1])
      end
      return v
    `,
  });

  globalThis._redisClientInstance = client;
  return client;
}

// Try native GETDEL; if server doesn't support it, fall back to Lua command
async function getAndDelete(redis: Redis, key: string): Promise<string | null> {
  try {
    const cmd = new Command("GETDEL", [key]);
    return (await redis.sendCommand(cmd)) as string | null;
  } catch (err: any) {
    const msg = String(err?.message || err);
    // Only handle the specific "unknown command" case
    if (/ERR\s+unknown\s+command.*\bgetdel\b/i.test(msg)) {
      // Call the defined command as a method so ioredis gets the correct `this`
      return (redis as any).getdel_compat(key);
    }
    throw err;
  }
}

export class RedisPkceStorage {
  private redis = getRedisClient();
  private keyPrefix = "pkce:";
  private ttlSeconds = 600; // 10 minutes

  async store(
    sessionId: string,
    data: { verifier: string; challenge: string; challengeMethod: string }
  ): Promise<void> {
    const key = `${this.keyPrefix}${sessionId}`;
    await this.redis.setex(key, this.ttlSeconds, JSON.stringify(data));
  }

  async get(sessionId: string): Promise<{
    verifier: string;
    challenge: string;
    challengeMethod: string;
  } | null> {
    const key = `${this.keyPrefix}${sessionId}`;
    const value = await getAndDelete(this.redis, key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async remove(sessionId: string): Promise<void> {
    await this.redis.del(`${this.keyPrefix}${sessionId}`);
  }
}

interface MsalCacheContextLike {
  cacheHasChanged: boolean;
  tokenCache: { serialize(): string; deserialize(v: string): void };
}

export class RedisCacheStorage {
  private redis = getRedisClient();
  private cacheKey: string;

  constructor() {
    const env = process.env.NODE_ENV || "development";
    const clientId = process.env.ENTRA_CLIENT_ID || "default";
    this.cacheKey = `msal:${env}:${clientId}:cache`;
  }

  beforeCacheAccess = async (ctx: MsalCacheContextLike) => {
    try {
      const data = await this.redis.get(this.cacheKey);
      if (data) ctx.tokenCache.deserialize(data);
    } catch (error) {
      logger.error(
        "Error loading MSAL cache from Redis:",
        (error as Error)?.message || error
      );
    }
  };

  afterCacheAccess = async (ctx: MsalCacheContextLike) => {
    if (!ctx.cacheHasChanged) return;
    try {
      await this.redis.set(this.cacheKey, ctx.tokenCache.serialize());
    } catch (error) {
      logger.error(
        "Error saving MSAL cache to Redis:",
        (error as Error)?.message || error
      );
    }
  };
}
