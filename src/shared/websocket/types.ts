export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface UseWebSocketConnectionOptions {
  url: string | null;
  onMessage: (data: string) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface UseWebSocketConnectionReturn {
  send: (data: string) => void;
}

export interface UseWebSocketReconnectOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldReconnect?: (closeEvent: CloseEvent) => boolean;
  onReconnect: () => void;
  onMaxAttemptsReached?: () => void;
}

export interface UseWebSocketReconnectReturn {
  attempts: number;
  scheduleReconnect: (closeEvent: CloseEvent) => void;
  resetAttempts: () => void;
}
