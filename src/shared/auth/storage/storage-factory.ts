import { logger } from "@/shared/lib/logger";
import fs from "fs";
import path from "path";
import { FileCacheStorage } from "../msal/cache-storage";
import { RedisCacheStorage, RedisPkceStorage } from "./redis-storage";

/**
 * Storage Factory - Creates appropriate storage implementations based on environment
 *
 * PKCE and Cache storage are intentionally separate because they have
 * fundamentally different requirements:
 * - PKCE: One-time use, atomic read-delete, session-scoped, short TTL (10 min)
 * - Cache: Persistent, serializable, longer TTL, cross-request sharing
 *
 * Environment Strategy:
 * - Development: File-based storage for easy debugging
 * - Production/Cloud: Redis for scalability and security
 */

// File storage for PKCE codes (development only)
class FilePkceStorage {
  private storageFile = path.join(process.cwd(), ".pkce-storage.json");
  private ttlMs = 10 * 60 * 1000; // 10 minutes

  private readStorage(): Record<string, any> {
    try {
      if (fs.existsSync(this.storageFile)) {
        return JSON.parse(fs.readFileSync(this.storageFile, "utf8"));
      }
    } catch (error) {
      logger.warn("Could not read PKCE storage, starting fresh:", error);
    }
    return {};
  }

  private writeStorage(storage: Record<string, any>): void {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(storage, null, 2));
    } catch (error) {
      logger.error("Could not write PKCE storage:", error);
    }
  }

  async store(
    sessionId: string,
    data: { verifier: string; challenge: string; challengeMethod: string }
  ): Promise<void> {
    const storage = this.readStorage();
    storage[sessionId] = { ...data, timestamp: Date.now() };
    this.writeStorage(storage);
  }

  async get(sessionId: string): Promise<{
    verifier: string;
    challenge: string;
    challengeMethod: string;
  } | null> {
    const storage = this.readStorage();
    const item = storage[sessionId];

    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttlMs) {
      delete storage[sessionId];
      this.writeStorage(storage);
      return null;
    }

    return {
      verifier: item.verifier,
      challenge: item.challenge,
      challengeMethod: item.challengeMethod,
    };
  }

  async remove(sessionId: string): Promise<void> {
    const storage = this.readStorage();
    delete storage[sessionId];
    this.writeStorage(storage);
  }
}

// PKCE Storage Factory - Creates storage for one-time PKCE codes
export function createPkceStorage() {
  const isProduction = process.env.APP_ENV !== "local";
  const hasRedisUrl = !!process.env.REDIS_URL;

  // Use file storage only for local development
  if (!isProduction) {
    return new FilePkceStorage();
  }

  // Production/cloud: Require Redis
  if (!hasRedisUrl) {
    throw new Error(
      "Production deployment requires REDIS_URL for secure PKCE storage. " +
        "File storage is not permitted in production environments."
    );
  }

  return new RedisPkceStorage();
}

// MSAL Cache Plugin Factory - Creates cache for persistent MSAL tokens
export function createCachePlugin() {
  const isProduction = process.env.APP_ENV !== "local";
  const hasRedisUrl = !!process.env.REDIS_URL;

  // Use file storage only for local development
  if (!isProduction) {
    return new FileCacheStorage();
  }

  // Production/cloud: Require Redis
  if (!hasRedisUrl) {
    throw new Error(
      "Production deployment requires REDIS_URL for secure MSAL token cache. " +
        "File storage is not permitted in production environments."
    );
  }

  return new RedisCacheStorage();
}
