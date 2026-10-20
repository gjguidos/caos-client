import { useCallback, useEffect, useRef } from "react";
import type {
  UseWebSocketConnectionOptions,
  UseWebSocketConnectionReturn,
} from "@/shared/websocket/types";

// Detach before closing: consumers read onClose as a dropped connection worth
// reconnecting, so a teardown we initiated must stay silent. Covers both the
// clean 1000 and the 1006 the browser reports for a pending handshake.
function closeSilently(ws: WebSocket): void {
  ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
  try {
    ws.close(1000, "Client closing connection");
    //eslint-disable-next-line no-empty
  } catch {}
}

export function useWebSocketConnection(
  options: UseWebSocketConnectionOptions
): UseWebSocketConnectionReturn {
  const { url, onMessage, onOpen, onClose, onError } = options;

  const wsRef = useRef<WebSocket | null>(null);

  // Store callbacks in refs to avoid effect re-runs when callbacks change
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const send = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    if (!url) {
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      onOpenRef.current?.();
    };

    ws.onmessage = async (e) => {
      let text: string;
      const tag = Object.prototype.toString.call(e.data);
      if (typeof e.data === "string") {
        text = e.data;
      } else if (tag === "[object Blob]") {
        text = await (e.data as Blob).text();
      } else if (tag === "[object ArrayBuffer]") {
        text = new TextDecoder().decode(e.data as ArrayBuffer);
      } else {
        text = String(e.data);
      }
      onMessageRef.current(text);
    };

    ws.onerror = (event) => {
      onErrorRef.current?.(event);
    };

    // Only reached for closes we did not initiate, so the socket in the ref is
    // always this one - closeSilently() detaches this handler before any other
    // socket can take its place.
    ws.onclose = (event) => {
      wsRef.current = null;
      onCloseRef.current?.(event);
    };

    return () => {
      closeSilently(ws);
      wsRef.current = null;
    };
  }, [url]);

  return {
    send,
  };
}
