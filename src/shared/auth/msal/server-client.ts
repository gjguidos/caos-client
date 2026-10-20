import { logger } from "@/shared/lib/logger";
import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { createCachePlugin } from "../storage/storage-factory";

// Singleton MSAL client and token cache instances
let msalClient: ConfidentialClientApplication | null = null;
let tokenCache: ReturnType<typeof createCachePlugin> | null = null;

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createLoggerConfig() {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    loggerCallback: () => {
      // Only show warnings and errors in production for security
    },
    piiLoggingEnabled: false,
    logLevel: isDevelopment ? 2 : 4, // Verbose in dev, errors only in prod
  };
}

/**
 * Gets the MSAL client instance (creates it on first call)
 * This client handles Microsoft authentication for the server
 */
export function getMsalClient() {
  // Return existing instance if already created
  if (msalClient) return msalClient;

  // Set up token caching (file storage in dev, Redis in production)
  tokenCache = createCachePlugin();

  // Build MSAL configuration
  const config: Configuration = {
    auth: {
      clientId: getRequiredEnvVar("ENTRA_CLIENT_ID"),
      authority: getRequiredEnvVar("MSAL_AUTHORITY"),
      clientSecret: getRequiredEnvVar("ENTRA_CLIENT_SECRET"),
    },
    cache: {
      cachePlugin: {
        beforeCacheAccess: tokenCache.beforeCacheAccess, // Load tokens from storage
        afterCacheAccess: tokenCache.afterCacheAccess, // Save tokens to storage
      },
    },
    system: {
      loggerOptions: createLoggerConfig(),
    },
  };

  // Create and cache the MSAL client
  try {
    msalClient = new ConfidentialClientApplication(config);
    return msalClient;
  } catch (error) {
    logger.error("MSAL client initialization failed:", error);
    throw error;
  }
}
