import {
  chatWebSocket,
  connectionEventCount,
  resetConnectionEventCount,
} from "@/mocks/websocket";
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";

export { chatWebSocket };
export interface ChatMessageOptions {
  agentSystemName?: string;
  renderableKind?: "text" | "markdown" | "image" | "link" | "json";
}

export function createChatMessage(
  text: string,
  options: ChatMessageOptions = {}
): string {
  const { agentSystemName = "test-agent", renderableKind = "text" } = options;

  return JSON.stringify({
    event: `${agentSystemName}.comm`,
    response: {
      message: {
        renderables: [
          {
            kind: renderableKind,
            [renderableKind]: text,
          },
        ],
      },
    },
  });
}

export function createLogMessage(message: string, level = "info"): string {
  return JSON.stringify({
    type: "log",
    message,
    level,
  });
}

export interface Renderable {
  kind: "text" | "markdown" | "image" | "link" | "json";
  text?: string;
  markdown?: string;
  url?: string;
  link?: string;
  json?: unknown;
}

// Waits for a WebSocket connection to be established within the current test.
// Uses connectionEventCount (reset to 0 before each test) instead of
// chatWebSocket.clients.size because MSW removes clients from the Set
// asynchronously after the close event fires, leaving stale entries that
// cause clients.size > 0 to resolve prematurely on the next test.
export async function waitForConnection(timeout = 3000): Promise<void> {
  await waitFor(
    () => {
      expect(connectionEventCount).toBeGreaterThan(0);
    },
    { timeout }
  );
}

export function getConnectionCount(): number {
  return chatWebSocket.clients.size;
}

export function closeAllConnections(): void {
  chatWebSocket.clients.forEach((client) => {
    client.close();
  });
}

export function simulateServerMessage(message: string | object): void {
  const data = typeof message === "string" ? message : JSON.stringify(message);
  chatWebSocket.broadcast(data);
}

export function simulateConnectionClose(): void {
  chatWebSocket.clients.forEach((client) => {
    client.close();
  });
}

export function simulateConnectionError(): void {
  chatWebSocket.clients.forEach((client) => {
    client.close();
  });
}

interface WebSocketMockConfig {
  autoConnect?: boolean;
  defaultAgentSystemName?: string;
}

const defaultWebSocketMockConfig: WebSocketMockConfig = {
  autoConnect: true,
  defaultAgentSystemName: "test-agent",
};

let currentWebSocketMockConfig: WebSocketMockConfig = {
  ...defaultWebSocketMockConfig,
};

export function setupWebSocketMocks(
  config: WebSocketMockConfig = {}
): WebSocketMockConfig {
  currentWebSocketMockConfig = {
    ...defaultWebSocketMockConfig,
    ...config,
  };
  return currentWebSocketMockConfig;
}

export function getWebSocketMocks(): WebSocketMockConfig {
  return currentWebSocketMockConfig;
}

// Used in vitest.setup.ts for global test cleanup
export function resetWebSocketMocks(): void {
  closeAllConnections();
  resetConnectionEventCount();
  currentWebSocketMockConfig = { ...defaultWebSocketMockConfig };
}
