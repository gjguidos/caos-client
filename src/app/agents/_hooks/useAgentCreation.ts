import { buildWebSocketBase } from "@/shared/auth/lib/utils";
import { getPublicApiBase } from "@/shared/lib/getApiClient";
import {
  fetchWebSocketToken,
  useWebSocketConnection,
  useWebSocketReconnect,
  type ConnectionState,
} from "@/shared/websocket";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  classifyFrame,
  createReducer,
  initialCreateState,
} from "./agentCreationMachine";

// Owns the Joshu-A creation socket: connection lifecycle (via the shared
// transport hooks) plus the creation state machine. The page stays a form.
export function useAgentCreation() {
  const [state, dispatch] = useReducer(createReducer, initialCreateState);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const apiBase = getPublicApiBase();
    if (!apiBase) {
      setConnectionState("error");
      return;
    }

    setConnectionState("connecting");

    const token = await fetchWebSocketToken();
    if (!token) {
      setConnectionState("error");
      return;
    }

    const base = buildWebSocketBase(apiBase);
    setWsUrl(`${base}/ws/api/v1/Joshu-A?token=${encodeURIComponent(token)}`);
  }, []);

  const reconnect = useWebSocketReconnect({
    onReconnect: () => {
      setConnectionState("reconnecting");
      connect();
    },
    onMaxAttemptsReached: () => setConnectionState("error"),
  });

  const ws = useWebSocketConnection({
    url: wsUrl,
    onMessage: (text) =>
      dispatch({ type: "frame", action: classifyFrame(text) }),
    onOpen: () => {
      reconnect.resetAttempts();
      setConnectionState("connected");
    },
    onClose: (event) => {
      setConnectionState("disconnected");
      reconnect.scheduleReconnect(event);
    },
  });

  useEffect(() => {
    connect();
  }, [connect]);

  // Unmount tears the socket down silently, but a reconnect already scheduled
  // still needs clearing so it can't fire on an unmounted component.
  useEffect(() => {
    return () => {
      reconnect.resetAttempts();
    };
  }, [reconnect]);

  const create = useCallback(
    (name: string, payload: object) => {
      dispatch({ type: "begin", name });
      ws.send(JSON.stringify(payload));
    },
    [ws]
  );

  const resetToEditing = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    ...state,
    connectionState,
    isConnected: connectionState === "connected",
    create,
    resetToEditing,
  };
}
