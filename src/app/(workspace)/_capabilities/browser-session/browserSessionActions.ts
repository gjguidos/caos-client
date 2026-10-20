"use server";

import fetchData from "@/shared/lib/server-actions";
import { logger } from "@/shared/lib/logger";

export type BrowserSessionStartPayload = {
  target_url: string;
  ttl_seconds?: number;
  headed?: boolean;
  success_url_contains?: string;
};

export type BrowserSessionByIdPayload = {
  browser_session_id: string;
};

type BrowserSessionActionResult<T = unknown> = {
  success: boolean;
  statusCode?: number;
  data?: T;
  message?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

function browserSessionBaseUrl() {
  return `${API_BASE.replace(/\/$/, "")}/v1/browser-sessions`;
}

function toActionError(error: unknown): BrowserSessionActionResult {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown browser-session action error.";

  logger.error(`[browserSessionActions] ${message}`);

  return {
    success: false,
    statusCode: 500,
    message,
  };
}

export async function startBrowserSessionAction(
  payload: BrowserSessionStartPayload
): Promise<BrowserSessionActionResult> {
  const path = `${browserSessionBaseUrl()}/start`;

  logger.debug(`[browserSessionActions.start] path=${path}`);

  try {
    const result = await fetchData<BrowserSessionActionResult>({
      path,
      method: "POST",
      data: payload,
      requireAuth: true,
      timeoutMs: 30_000,
    });

    return (
      result ?? {
        success: false,
        statusCode: 500,
        message: "Browser-session start returned no response.",
      }
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function captureBrowserSessionAction(
  payload: BrowserSessionByIdPayload
): Promise<BrowserSessionActionResult> {
  const path = `${browserSessionBaseUrl()}/capture`;

  logger.debug(`[browserSessionActions.capture] path=${path}`);

  try {
    const result = await fetchData<BrowserSessionActionResult>({
      path,
      method: "POST",
      data: payload,
      requireAuth: true,
      timeoutMs: 30_000,
    });

    return (
      result ?? {
        success: false,
        statusCode: 500,
        message: "Browser-session capture returned no response.",
      }
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshBrowserSessionStatusAction(
  payload: BrowserSessionByIdPayload
): Promise<BrowserSessionActionResult> {
  const path = `${browserSessionBaseUrl()}/status`;

  logger.debug(`[browserSessionActions.status] path=${path}`);

  try {
    const result = await fetchData<BrowserSessionActionResult>({
      path,
      method: "POST",
      data: payload,
      requireAuth: true,
      timeoutMs: 15_000,
    });

    return (
      result ?? {
        success: false,
        statusCode: 500,
        message: "Browser-session status returned no response.",
      }
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function closeBrowserSessionAction(
  browserSessionId: string
): Promise<BrowserSessionActionResult> {
  const path = `${browserSessionBaseUrl()}/${encodeURIComponent(
    browserSessionId
  )}`;

  logger.debug(`[browserSessionActions.close] path=${path}`);

  try {
    const result = await fetchData<BrowserSessionActionResult>({
      path,
      method: "DELETE",
      requireAuth: true,
      timeoutMs: 15_000,
    });

    return (
      result ?? {
        success: true,
        statusCode: 204,
        message: "Browser session closed.",
      }
    );
  } catch (error) {
    return toActionError(error);
  }
}
