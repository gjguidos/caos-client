"use client";

import { useCallback, useMemo, useState } from "react";

import {
  captureBrowserSessionAction,
  closeBrowserSessionAction,
  refreshBrowserSessionStatusAction,
  startBrowserSessionAction,
} from "@/app/(workspace)/_capabilities/browser-session/browserSessionActions";

export type BrowserSessionStatus =
  | "idle"
  | "starting"
  | "awaiting_authentication"
  | "capturing"
  | "ready"
  | "closing"
  | "expired"
  | "failed";

type ApiEnvelope<T> = {
  success: boolean;
  statusCode?: number;
  data?: T;
  message?: string;
  pythonVersion?: string;
  systemVersion?: string;
};

export type BrowserSessionData = {
  ok?: boolean;
  ready: boolean;
  browser_session_id: string;
  status?: string;
  domain?: string;
  target_url?: string;
  final_url?: string;
  interactive_url?: string | null;
  tenant_id?: string | null;
  ttl_seconds?: number | null;
  expires_at?: string | null;
  alive?: boolean;
  expired?: boolean;
  cookies_count?: number | null;
  matching_cookie_count?: number | null;
  origins_count?: number | null;
  secrets_redacted?: boolean;
};

export type BrowserSessionStartResponse = BrowserSessionData;
export type BrowserSessionCaptureResponse = BrowserSessionData;
export type BrowserSessionStatusResponse = BrowserSessionData;

export type UseBrowserSessionOptions = {
  enabled?: boolean;

  /**
   * Automatically open the noVNC browser when a session starts.
   */
  autoOpen?: boolean;
};

export type UseBrowserSessionReturn = {
  browserSessionId: string | null;
  interactiveUrl: string | null;
  expiresAt: string | null;

  status: BrowserSessionStatus;
  ready: boolean;
  alive: boolean | null;
  error: string | null;

  isStarting: boolean;
  isCapturing: boolean;
  isClosing: boolean;
  isBusy: boolean;
  hasSession: boolean;

  start: (targetUrl: string) => Promise<BrowserSessionStartResponse | null>;
  capture: () => Promise<BrowserSessionCaptureResponse | null>;
  refreshStatus: () => Promise<BrowserSessionStatusResponse | null>;
  close: () => Promise<boolean>;
  openInteractiveBrowser: () => void;
  reset: () => void;
  /**
   * Adopt a session the backend reported as authenticated over the bridge,
   * skipping the manual capture round-trip.
   */
  markAuthenticated: (session: {
    browserSessionId: string;
    ready?: boolean;
  }) => void;
};

export function useBrowserSession({
  enabled = true,
  autoOpen = true,
}: UseBrowserSessionOptions = {}): UseBrowserSessionReturn {
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);

  const [interactiveUrl, setInteractiveUrl] = useState<string | null>(null);

  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [status, setStatus] = useState<BrowserSessionStatus>("idle");

  const [ready, setReady] = useState(false);
  const [alive, setAlive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setBrowserSessionId(null);
    setInteractiveUrl(null);
    setExpiresAt(null);
    setStatus("idle");
    setReady(false);
    setAlive(null);
    setError(null);
  }, []);

  const markAuthenticated = useCallback(
    (session: { browserSessionId: string; ready?: boolean }) => {
      setBrowserSessionId(session.browserSessionId);
      setReady(session.ready ?? true);
      setAlive(true);
      setStatus("ready");
      setError(null);
    },
    []
  );

  const openInteractiveBrowser = useCallback(() => {
    if (!interactiveUrl) {
      return;
    }

    window.open(interactiveUrl, "_blank", "noopener,noreferrer");
  }, [interactiveUrl]);

  const start = useCallback(
    async (targetUrl: string): Promise<BrowserSessionStartResponse | null> => {
      if (!enabled) {
        setError("Browser-session functionality is disabled.");
        return null;
      }

      const normalizedTargetUrl = targetUrl.trim();

      if (!normalizedTargetUrl) {
        setStatus("failed");
        setError("A target URL is required.");
        return null;
      }

      let successUrlContains: string;

      try {
        successUrlContains = new URL(normalizedTargetUrl).hostname;
      } catch {
        setStatus("failed");
        setError("Enter a valid URL before starting sign-in.");
        return null;
      }

      setStatus("starting");
      setError(null);
      setReady(false);
      setAlive(null);

      /*
       * Opening the window before awaiting the server action helps avoid
       * popup blocking. The URL is assigned after AgentVerse returns the
       * safe interactive noVNC URL.
       */
      const browserWindow = autoOpen ? window.open("", "_blank") : null;

      if (browserWindow) {
        browserWindow.opener = null;
        browserWindow.document.title = "Starting browser session";
        browserWindow.document.body.innerText =
          "Preparing secure browser session...";
      }

      try {
        const payload = await startBrowserSessionAction({
          target_url: normalizedTargetUrl,
          ttl_seconds: 1800,
          headed: true,
          success_url_contains: successUrlContains,
        });

        const session = unwrapApiData<BrowserSessionData>(
          payload,
          "The browser-session response was incomplete."
        );

        if (!session.browser_session_id || !session.interactive_url) {
          throw new Error("The browser-session response was incomplete.");
        }

        setBrowserSessionId(session.browser_session_id);
        setInteractiveUrl(session.interactive_url);
        setExpiresAt(session.expires_at ?? null);
        setReady(Boolean(session.ready));
        setAlive(true);

        setStatus(session.ready ? "ready" : "awaiting_authentication");

        if (browserWindow) {
          browserWindow.location.replace(session.interactive_url);
        } else if (autoOpen) {
          window.open(session.interactive_url, "_blank", "noopener,noreferrer");
        }

        return session;
      } catch (caughtError) {
        const message = toErrorMessage(caughtError);

        if (browserWindow) {
          browserWindow.document.title = "Browser session failed";
          browserWindow.document.body.innerText = message;
        }

        setStatus("failed");
        setReady(false);
        setAlive(false);
        setError(message);

        return null;
      }
    },
    [enabled, autoOpen]
  );

  const capture =
    useCallback(async (): Promise<BrowserSessionCaptureResponse | null> => {
      if (!browserSessionId) {
        setError("No browser session exists to capture.");
        return null;
      }

      setStatus("capturing");
      setError(null);

      try {
        const payload = await captureBrowserSessionAction({
          browser_session_id: browserSessionId,
        });

        const session = unwrapApiData<BrowserSessionData>(
          payload,
          "The browser-session capture response was incomplete."
        );

        setBrowserSessionId(session.browser_session_id);
        setReady(Boolean(session.ready));
        setAlive(true);
        setExpiresAt(session.expires_at ?? expiresAt);

        if (session.interactive_url) {
          setInteractiveUrl(session.interactive_url);
        }

        setStatus(session.ready ? "ready" : "awaiting_authentication");

        if (!session.ready) {
          setError(
            "No authenticated browser state was detected. Complete sign-in and try again."
          );
        }

        return session;
      } catch (caughtError) {
        setStatus("awaiting_authentication");
        setReady(false);
        setError(toErrorMessage(caughtError));

        return null;
      }
    }, [browserSessionId, expiresAt]);

  const refreshStatus =
    useCallback(async (): Promise<BrowserSessionStatusResponse | null> => {
      if (!browserSessionId) {
        return null;
      }

      try {
        const payload = await refreshBrowserSessionStatusAction({
          browser_session_id: browserSessionId,
        });

        const session = unwrapApiData<BrowserSessionData>(
          payload,
          "The browser-session status response was incomplete."
        );

        const sessionAlive = session.alive ?? !session.expired;

        setBrowserSessionId(session.browser_session_id);
        setReady(Boolean(session.ready));
        setAlive(sessionAlive);
        setExpiresAt(session.expires_at ?? null);

        if (session.interactive_url) {
          setInteractiveUrl(session.interactive_url);
        }

        if (session.expired || !sessionAlive) {
          setStatus("expired");
          setReady(false);
        } else if (session.ready) {
          setStatus("ready");
        } else {
          setStatus("awaiting_authentication");
        }

        setError(null);

        return session;
      } catch (caughtError) {
        setStatus("failed");
        setAlive(false);
        setReady(false);
        setError(toErrorMessage(caughtError));

        return null;
      }
    }, [browserSessionId]);

  const close = useCallback(async (): Promise<boolean> => {
    if (!browserSessionId) {
      reset();
      return true;
    }

    setStatus("closing");
    setError(null);

    try {
      await closeBrowserSessionAction(browserSessionId);

      reset();
      return true;
    } catch (caughtError) {
      setStatus("failed");
      setError(toErrorMessage(caughtError));

      return false;
    }
  }, [browserSessionId, reset]);

  const isStarting = status === "starting";
  const isCapturing = status === "capturing";
  const isClosing = status === "closing";

  const isBusy = isStarting || isCapturing || isClosing;

  const hasSession = Boolean(browserSessionId);

  return useMemo(
    () => ({
      browserSessionId,
      interactiveUrl,
      expiresAt,

      status,
      ready,
      alive,
      error,

      isStarting,
      isCapturing,
      isClosing,
      isBusy,
      hasSession,

      start,
      capture,
      refreshStatus,
      close,
      openInteractiveBrowser,
      reset,
      markAuthenticated,
    }),
    [
      browserSessionId,
      interactiveUrl,
      expiresAt,
      status,
      ready,
      alive,
      error,
      isStarting,
      isCapturing,
      isClosing,
      isBusy,
      hasSession,
      start,
      capture,
      refreshStatus,
      close,
      openInteractiveBrowser,
      reset,
      markAuthenticated,
    ]
  );
}

function unwrapApiData<T>(payload: unknown, fallback: string): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    (payload as { success?: boolean }).success === false
  ) {
    const message =
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : fallback;

    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as ApiEnvelope<T>).data;

    if (data) {
      return data;
    }
  }

  throw new Error(fallback);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected browser-session error occurred.";
}
