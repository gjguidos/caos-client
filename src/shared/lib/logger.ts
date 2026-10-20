/**
 * Centralized logging utility with environment-based control
 *
 * Controlled by ENABLE_LOGGING environment variable:
 * - 'true' = All logs enabled (local development, debugging)
 * - 'false' or unset = Only errors and warnings (production)
 *
 * Usage:
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('Debug info', data);
 * logger.info('Info message', data);
 * logger.warn('Warning', data);
 * logger.error('Error occurred', error);
 */

/**
 * Cached logging enabled state. Computed on first logger call and never invalidated
 * for the lifetime of the page. Safe to cache because JavaScript is single-threaded
 * and this function executes synchronously (no re-entrancy).
 */
let cachedLoggingEnabled: boolean | undefined = undefined;

/**
 * Return whether logging is enabled.
 * Uses runtime `window.__ENV__` (from `/env.js`) when present, falls back to
 * build-time `process.env.NEXT_PUBLIC_ENABLE_LOGGING`. Lazy-evaluated and cached.
 */
function isLoggingEnabled(): boolean {
  // Return cached value if already computed
  if (cachedLoggingEnabled !== undefined) {
    return cachedLoggingEnabled;
  }

  try {
    // Prefer runtime-injected env (browser client, after env.js loads)
    if (typeof window !== "undefined" && window.__ENV__) {
      cachedLoggingEnabled =
        String(window.__ENV__.NEXT_PUBLIC_ENABLE_LOGGING) === "true";
    } else {
      // Fall back to build-time env (SSR, Node.js server, or before env.js loads)
      cachedLoggingEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGGING === "true";
    }
    return cachedLoggingEnabled;
  } catch (e) {
    // Defensive: if anything goes wrong, keep logs off by default
    cachedLoggingEnabled = false;
    return cachedLoggingEnabled;
  }
}

export const logger = {
  /**
   * Debug logs
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isLoggingEnabled()) {
      console.log("[DEBUG]", ...args);
    }
  },

  /**
   * Info logs
   * Use for general informational messages
   */
  info: (...args: any[]) => {
    if (isLoggingEnabled()) {
      console.info("[INFO]", ...args);
    }
  },

  /**
   * Warning logs
   * Use for non-critical issues that should be investigated
   */
  warn: (...args: any[]) => {
    if (isLoggingEnabled()) {
      console.warn("[WARN]", ...args);
    }
  },

  /**
   * Error logs
   * Use for errors and exceptions that need attention
   */
  error: (...args: any[]) => {
    if (isLoggingEnabled()) {
      console.error("[ERROR]", ...args);
    }
  },
};
