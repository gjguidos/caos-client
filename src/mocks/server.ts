import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import { websocketHandlers } from "./websocket";

export const server = setupServer(...handlers, ...websocketHandlers);

// Re-export WebSocket link for test control
export { chatWebSocket } from "./websocket";
