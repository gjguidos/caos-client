import { useCallback, useRef } from "react";
import type {
  UseWebSocketReconnectOptions,
  UseWebSocketReconnectReturn,
} from "./types";

export function useWebSocketReconnect(
  options: UseWebSocketReconnectOptions
): UseWebSocketReconnectReturn {
  const {
    maxAttempts = 10,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldReconnect,
    onReconnect,
    onMaxAttemptsReached,
  } = options;

  const attemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetAttempts = useCallback(() => {
    attemptsRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (closeEvent: CloseEvent) => {
      const shouldTry = shouldReconnect
        ? shouldReconnect(closeEvent)
        : closeEvent.code !== 1000;

      if (!shouldTry) {
        return;
      }

      if (attemptsRef.current >= maxAttempts) {
        onMaxAttemptsReached?.();
        return;
      }

      attemptsRef.current += 1;

      const exponentialDelay =
        baseDelayMs * Math.pow(2, attemptsRef.current - 1);
      const delay = Math.min(exponentialDelay, maxDelayMs);

      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((data) => {
          if (data.authenticated) {
            timeoutRef.current = setTimeout(() => {
              onReconnect();
            }, delay);
          }
        })
        .catch(() => {
          timeoutRef.current = setTimeout(() => {
            onReconnect();
          }, delay);
        });
    },
    [
      maxAttempts,
      baseDelayMs,
      maxDelayMs,
      shouldReconnect,
      onReconnect,
      onMaxAttemptsReached,
    ]
  );

  return {
    attempts: attemptsRef.current,
    scheduleReconnect,
    resetAttempts,
  };
}
