// Generic WebSocket transport types live in @/shared/websocket; re-exported so
// workspace importers have one place to reach for them.
import type { ConnectionState } from "@/shared/websocket";

export type {
  ConnectionState,
  UseWebSocketConnectionOptions,
  UseWebSocketConnectionReturn,
  UseWebSocketReconnectOptions,
  UseWebSocketReconnectReturn,
} from "@/shared/websocket";

// FileRef belongs to the shared upload API; re-exported for the same reason.
export type { FileRef } from "@/shared/api/upload_file";

export interface WsUrlOptions {
  apiBase: string;
  agentSystemName: string;
  agentName: string;
  token: string;
}

export interface ParsedWSMessage {
  /** `bridge` carries an out-of-band agent bridge event; see `bridgeEvents`. */
  type: "chat" | "bridge" | "domain_event" | "other";
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
