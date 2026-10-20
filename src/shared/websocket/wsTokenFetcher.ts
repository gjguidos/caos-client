import { logger } from "@/shared/lib/logger";

export async function fetchWebSocketToken(): Promise<string | null> {
  try {
    const tokenResponse = await fetch("/api/auth/websocket-token");
    if (!tokenResponse.ok) {
      logger.error("WebSocket token fetch failed:", tokenResponse.status);
      return null;
    }
    const { token } = await tokenResponse.json();
    return token || null;
  } catch (error) {
    logger.error("Failed to fetch WebSocket token:", error);
    return null;
  }
}
