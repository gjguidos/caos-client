import { ws } from "msw";

export const chatWebSocket = ws.link(/wss?:\/\/.*\/ws\/api\/v1\/agent\/.*/);

// Incremented each time a new WebSocket connection is intercepted.
// Reset between tests via resetConnectionEventCount() so waitForConnection()
// can check count > 0 without worrying about stale chatWebSocket.clients entries.
export let connectionEventCount = 0;

export function resetConnectionEventCount(): void {
  connectionEventCount = 0;
}

export const websocketHandlers = [
  chatWebSocket.addEventListener("connection", () => {
    connectionEventCount++;
    console.log("[MSW] WebSocket connection established");
  }),
];
