// Generic WebSocket transport types now live in @/shared/websocket; re-exported
// so existing chat importers keep resolving.
import type { ConnectionState } from "@/shared/websocket";

export type {
  ConnectionState,
  UseWebSocketConnectionOptions,
  UseWebSocketConnectionReturn,
  UseWebSocketReconnectOptions,
  UseWebSocketReconnectReturn,
} from "@/shared/websocket";

// FileRef moved to the shared upload API; re-exported so chat importers keep working.
export type { FileRef } from "@/shared/api/upload_file";

export interface WsUrlOptions {
  apiBase: string;
  agentSystemName: string;
  agentName: string;
  token: string;
}

export interface ParsedWSMessage {
  type: "chat" | "other";
  text: string | null;
  raw: unknown;
  payload?: unknown;
}

export interface UseAgentWebSocketOptions {
  agentSystemName: string;
  agentName: string;
  enabled?: boolean;
  onMessage: (parsed: ParsedWSMessage) => void;
  onLog?: (message: string) => void;
  onConnectionChange?: (state: ConnectionState) => void;
}

export interface UseAgentWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  send: (payload: object) => void;
  disconnect: () => void;
}
