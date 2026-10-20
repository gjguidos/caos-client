import getPublicApiBase from "@/shared/lib/getApiClient";
import { logger } from "@/shared/lib/logger";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConnectionState,
  ParsedWSMessage,
  UseAgentWebSocketOptions,
  UseAgentWebSocketReturn,
} from "../websocket.types";
import {
  useWebSocketConnection,
  useWebSocketReconnect,
} from "@/shared/websocket";
import { buildAgentWebSocketUrl } from "../_utils/wsUrlBuilder";
import { fetchWebSocketToken } from "@/shared/websocket/wsTokenFetcher";
import { extractReplyText, pickPayloadFromWS } from "../_utils/messageParser";

export function useAgentWebSocket(
  options: UseAgentWebSocketOptions
): UseAgentWebSocketReturn {
  const {
    agentSystemName,
    agentName,
    enabled = true,
    onMessage,
    onLog,
    onConnectionChange,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const onMessageRef = useRef(onMessage);
  const onLogRef = useRef(onLog);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onConnectionChangeRef.current?.(state);
  }, []);

  const handleMessage = useCallback((text: string) => {
    try {
      const json = JSON.parse(text);

      if (json?.type === "log") {
        onLogRef.current?.(json.message);
        return;
      }

      if (json?.event?.endsWith?.(".comm")) {
        const payload = pickPayloadFromWS(json);
        const replyText = extractReplyText(payload);
        const parsed: ParsedWSMessage = {
          type: "chat",
          text: replyText,
          raw: json,
          payload,
        };
        onMessageRef.current(parsed);
        return;
      }

      const parsed: ParsedWSMessage = {
        type: "other",
        text: JSON.stringify(json),
        raw: json,
      };
      onMessageRef.current(parsed);
    } catch {
      const parsed: ParsedWSMessage = {
        type: "other",
        text: text,
        raw: text,
      };
      onMessageRef.current(parsed);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled || !agentSystemName || !agentName) {
      return;
    }

    const apiBase = getPublicApiBase();
    if (!apiBase) {
      onLogRef.current?.(
        "Missing API base configuration (NEXT_PUBLIC_API_BASE)."
      );
      updateConnectionState("error");
      return;
    }

    updateConnectionState("connecting");

    const token = await fetchWebSocketToken();
    if (!token) {
      onLogRef.current?.("Failed to authenticate for WebSocket connection");
      updateConnectionState("error");
      return;
    }

    const url = buildAgentWebSocketUrl({
      apiBase,
      agentSystemName,
      agentName,
      token,
    });

    logger.debug(
      "Connecting to WebSocket URL:",
      url.replace(/token=[^&]+/, "token=***")
    );

    setWsUrl(url);
  }, [enabled, agentSystemName, agentName, updateConnectionState]);

  const reconnect = useWebSocketReconnect({
    maxAttempts: 10,
    onReconnect: () => {
      updateConnectionState("reconnecting");
      connect();
    },
    onMaxAttemptsReached: () => {
      onLogRef.current?.(
        "Connection lost. Please refresh the page to reconnect."
      );
      updateConnectionState("error");
    },
  });

  const ws = useWebSocketConnection({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: () => {
      logger.info("WebSocket connected successfully");
      reconnect.resetAttempts();
      updateConnectionState("connected");
    },
    onClose: (event) => {
      logger.debug("WebSocket closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      updateConnectionState("disconnected");
      reconnect.scheduleReconnect(event);
    },
    onError: (error) => {
      logger.error("WebSocket error:", error);
      onLogRef.current?.("WebSocket encountered an error.");
    },
  });

  // Connect on mount and whenever the target agent changes. Deliberately not
  // keyed on `wsUrl`: disconnect() clears it, and reconnects call connect()
  // directly, so reacting to it here would just undo an explicit disconnect.
  useEffect(() => {
    if (enabled && agentSystemName && agentName) {
      connect();
    }
  }, [enabled, agentSystemName, agentName, connect]);

  const send = useCallback(
    (payload: object) => {
      ws.send(JSON.stringify(payload));
    },
    [ws]
  );

  // Clearing the url tears the socket down through the connection effect's
  // cleanup; resetAttempts() drops any reconnect already scheduled.
  const disconnect = useCallback(() => {
    reconnect.resetAttempts();
    setWsUrl(null);
    updateConnectionState("disconnected");
  }, [reconnect, updateConnectionState]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    send,
    disconnect,
  };
}
