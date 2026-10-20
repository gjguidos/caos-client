/**
 * Authentication Utilities
 * Shared helper functions for auth routes
 */

/**
 * Gets the proper base URL for redirects, handling development environment edge cases
 * @param requestUrl - The incoming request URL
 * @returns The base URL (origin) suitable for redirects
 */
// Removed unused import

/**
 * Safer getBaseUrl for redirects.
 * Behavior:
 * 1) If NEXT_SERVER_BASE_URL is set and valid, use its origin (runtime override).
 * 2) Otherwise use the request origin, mapping 0.0.0.0 -> localhost.
 */
export function getBaseUrl(request: Request): string {
  // 1) Explicit override (recommended in Azure)
  const fromEnv = process.env.NEXT_SERVER_BASE_URL;
  if (fromEnv) return new URL(fromEnv).origin;

  // 3) Fallback to the request URL (fix 0.0.0.0 in dev)
  const u = new URL((request as any).url);
  if (u.hostname === "0.0.0.0") u.hostname = "localhost";
  return u.origin;
}

export function buildWebSocketBase(apiBase: string): string {
  if (!apiBase) return apiBase;

  try {
    const parsed = new URL(apiBase);
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    // strip a terminal "/api" with optional trailing slash
    parsed.pathname = parsed.pathname.replace(/\/api\/?$/, "");
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    return (parsed.origin + pathname).replace(/\/$/, "");
  } catch {
    // fallback: also strip optional trailing slash
    try {
      return apiBase
        .replace(/\/api\/?$/, "")
        .replace(/^https?:/, (m) => (m === "https:" ? "wss:" : "ws:"));
    } catch {
      return apiBase;
    }
  }
}
