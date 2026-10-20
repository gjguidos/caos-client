## Custom Render

Import the custom `render` function from `@/test-utils/test-utils` instead of
`@testing-library/react`:

```typescript
import { render, screen, userEvent, waitFor } from "@/test-utils/test-utils";
```

This wraps components with all necessary providers (Redux, etc.) and applies global mocks.

## Mocks examples

### Default Behavior

```typescript
render(<MyComponent />);
```

Uses default mocks:

- `userId: "test-user-id"`
- `pathname: "/"`
- `params: {}`
- `fetchAgentById: { success: true, data: defaultMockAgentData }`

### Navigation

```typescript
render(<MyComponent />, {
  navigation: {
    params: { id: "123" },
    searchParams: { tab: "settings" },
    pathname: "/custom/path",
  },
});
```

### Authentication

```typescript
// Unauthenticated user
render(<MyComponent />, {
  auth: {
    userId: null,
    isAuthLoading: false,
    session: null,
  },
});
// Loading state
render(<MyComponent />, {
  auth: {
    userId: null,
    isAuthLoading: true,
    session: null,
  },
});
```

### Agent API

```typescript
// Error response
render(<MyComponent />, {
  agent: {
    fetchAgentById: {
      success: false,
      error: "Agent not found",
    },
  },
});
// Custom agent data
render(<MyComponent />, {
  agent: {
    fetchAgentById: {
      success: true,
      data: {
        id: "custom-agent",
        name: "Custom Agent",
        tools: [{ name: "RAG Tool" }],
        collections: ["my-collection"],
      },
    },
  },
});
```

### Redux Store

```typescript
render(<MyComponent />, {
  preloadedState: {
    tools: { list: [{ name: "Custom Tool" }] },
  },
});
```

## WebSocket Testing

WebSocket connections are mocked via MSW. We provide utility functions to simplify WebSocket
testing.

### Quick Start

```typescript
import {
  waitForConnection,
  simulateServerMessage,
  createChatMessage,
  closeAllConnections,
} from "@/test-utils/test-utils";

describe("MyWebSocketComponent", () => {
  beforeEach(() => {
    closeAllConnections(); // Clean up between tests (automatic via vitest.setup.ts)
  });

  it("receives and displays chat messages", async () => {
    render(<MyComponent />);

    // Wait for WebSocket to connect
    await waitForConnection();

    // Simulate receiving a chat message
    simulateServerMessage(createChatMessage("Hello from server!"));

    // Assert the message is displayed
    await waitFor(() => {
      expect(screen.getByText("Hello from server!")).toBeInTheDocument();
    });
  });
});
```

### Message Factory Functions

Create type-safe WebSocket messages:

```typescript
// Simple chat message
const message = createChatMessage("Hello!");

// Chat message with options
const message = createChatMessage("Hello!", {
  agentSystemName: "my-agent",
  renderableKind: "markdown", // text, markdown, image, link, json
});

// Log message
const logMsg = createLogMessage("Connection established", "info");

// Custom renderables
const customMsg = createRenderableMessage([
  { kind: "text", text: "Hello" },
  { kind: "image", url: "https://example.com/image.png" },
]);

// Error message
const errorMsg = createErrorMessage("Something went wrong");
```

### WebSocket State Helpers

```typescript
// Wait for connection (with timeout)
await waitForConnection(5000); // default: 3000ms

// Wait for disconnection
await waitForDisconnection();

// Get connection count
const count = getConnectionCount();
expect(count).toBe(1);

// Close all connections
closeAllConnections();
```

### WebSocket Simulation Helpers

```typescript
// Simulate server message (string or object)
simulateServerMessage("raw string");
simulateServerMessage({ type: "custom", data: "value" });

// Simulate connection close
simulateConnectionClose();

// Simulate connection error
simulateConnectionError();
```

### Advanced: Complete Chat Interaction

```typescript
// Simulates full flow: wait for connection + send message
await simulateChatInteraction("Agent response text", {
  agentSystemName: "test-agent",
});
```

### Direct MSW Access

For advanced scenarios, you can still use `chatWebSocket` directly:

```typescript
import { chatWebSocket } from "@/mocks/websocket";

// Check connection count
expect(chatWebSocket.clients.size).toBeGreaterThan(0);

// Broadcast raw message
chatWebSocket.broadcast(JSON.stringify({ custom: "data" }));

// Close specific client
chatWebSocket.clients.forEach((client) => client.close());
```
