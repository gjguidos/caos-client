import { logger } from "@/shared/lib/logger";
import fs from "fs";
import path from "path";

// Use file-based storage for MSAL token cache to persist across requests
const CACHE_FILE = path.join(process.cwd(), ".msal-cache.json");

export class FileCacheStorage {
  private cache: any = {};

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, "utf8");
        this.cache = JSON.parse(data);

        // Set restrictive file permissions (owner read/write only)
        try {
          fs.chmodSync(CACHE_FILE, 0o600);
        } catch (permError) {
          logger.warn("Could not set restrictive permissions on cache file");
        }
      }
    } catch (error) {
      logger.error("Error loading MSAL cache:", error);
      this.cache = {};
    }
  }

  private saveCache() {
    try {
      // Write with restrictive permissions
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2), {
        mode: 0o600,
      });

      logger.debug("MSAL cache updated");
    } catch (error) {
      logger.error("Error saving MSAL cache:", error);
    }
  }

  beforeCacheAccess = async (cacheContext: any) => {
    cacheContext.tokenCache.deserialize(JSON.stringify(this.cache));
  };

  afterCacheAccess = async (cacheContext: any) => {
    if (cacheContext.cacheHasChanged) {
      this.cache = JSON.parse(cacheContext.tokenCache.serialize());
      this.saveCache();
    }
  };
}
