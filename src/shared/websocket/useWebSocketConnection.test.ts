import {
  chatWebSocket,
  closeAllConnections,
  simulateServerMessage,
  waitForConnection,
} from "@/test-utils/test-utils";
import { server } from "@/mocks/server";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWebSocketConnection } from "./useWebSocketConnection";

// Records what the server side of this test's sockets saw. The server
// observing a close is the settle point for "this teardown stayed silent":
// it proves the close was processed, so a fixed sleep isn't needed.
// chatWebSocket.clients can't serve that role - MSW drains it asynchronously
// and stale entries from earlier tests linger.
function trackServerSockets() {
  const closedUrls: string[] = [];
  const received: string[] = [];

  server.use(
    chatWebSocket.addEventListener("connection", ({ client }) => {
      client.addEventListener("message", (event) => {
        received.push(String(event.data));
      });
      client.addEventListener("close", () => {
        closedUrls.push(client.url.toString());
      });
    })
  );

  return {
    received,
    waitForClose: (url: string) =>
      waitFor(() => {
        expect(closedUrls).toContain(url);
      }),
  };
}

describe("useWebSocketConnection", () => {
  const TEST_URL = "ws://localhost:8000/ws/api/v1/agent/test-agent";
  const TEST_MESSAGE = "Hello WebSocket";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Close all connections to clean up between tests
    closeAllConnections();
  });

  describe("Null URL", () => {
    it("does not create connection when URL is null", () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          url: null,
          onMessage,
        })
      );

      // Should not have any WebSocket clients
      expect(chatWebSocket.clients.size).toBe(0);
    });

    it("send() is no-op when connection not OPEN", () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocketConnection({
          url: null,
          onMessage,
        })
      );

      // Should not throw when sending without connection
      expect(() => result.current.send(TEST_MESSAGE)).not.toThrow();
    });
  });

  describe("Stable References", () => {
    it("send callback has a stable reference", () => {
      const onMessage = vi.fn();

      const { result, rerender } = renderHook(() =>
        useWebSocketConnection({
          url: null,
          onMessage,
        })
      );

      const sendRef = result.current.send;

      rerender();

      expect(result.current.send).toBe(sendRef);
    });
  });

  describe("Callback Invocations", () => {
    it("calls onOpen on connection establishment", async () => {
      const onMessage = vi.fn();
      const onOpen = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
          onOpen,
        })
      );

      // Wait for onOpen to be called
      await waitFor(() => {
        expect(onOpen).toHaveBeenCalledTimes(1);
      });
    });

    // TODO: onError callback testing is not implemented in unit tests
    /* Leaving this comment to document behaviour:  
      MSW's WebSocket mock (WebSocketClientConnectionProtocol) doesn't expose the onerror
      handler or provide a reliable way to simulate connection errors, at least not in a clear manner. The error event
      cannot be properly triggered or dispatched to test the onError callback behavior.
      Lets revist this with more time or test the onError callback in integration tests where real WebSocket
      connections can encounter actual network errors.
    */

    it("optional callbacks can be omitted", async () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitForConnection();

      expect(result.current).toBeDefined();
    });
  });

  describe("Connection Creation", () => {
    it("creates WebSocket connection when URL provided", async () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );
      await waitForConnection();
    });
  });

  describe("Message Handling", () => {
    it("calls onMessage with string data", async () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitForConnection();

      simulateServerMessage(TEST_MESSAGE);

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(TEST_MESSAGE);
      });
    });

    it("calls onMessage with Blob data (converts to text)", async () => {
      const onMessage = vi.fn();
      const BLOB_TEXT = "Blob content";

      renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitFor(() => {
        expect(chatWebSocket.clients.size).toBeGreaterThan(0);
      });

      const blob = new Blob([BLOB_TEXT], { type: "text/plain" });
      chatWebSocket.broadcast(blob);

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(BLOB_TEXT);
      });
    });

    it("calls onMessage with ArrayBuffer data (converts to text)", async () => {
      const onMessage = vi.fn();
      const BUFFER_TEXT = "Buffer content";

      renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitFor(() => {
        expect(chatWebSocket.clients.size).toBeGreaterThan(0);
      });

      const encoder = new TextEncoder();
      const buffer = encoder.encode(BUFFER_TEXT).buffer;
      chatWebSocket.broadcast(buffer);

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(BUFFER_TEXT);
      });
    });

    it("onMessage callback can be updated without reconnecting", async () => {
      const onMessage1 = vi.fn();
      const onMessage2 = vi.fn();

      const { rerender } = renderHook(
        ({ onMessage }) =>
          useWebSocketConnection({
            url: TEST_URL,
            onMessage,
          }),
        { initialProps: { onMessage: onMessage1 } }
      );

      await waitForConnection();

      const clientCountBefore = chatWebSocket.clients.size;

      rerender({ onMessage: onMessage2 });

      expect(chatWebSocket.clients.size).toBe(clientCountBefore);

      simulateServerMessage(TEST_MESSAGE);

      await waitFor(() => {
        expect(onMessage2).toHaveBeenCalledWith(TEST_MESSAGE);
      });

      expect(onMessage1).not.toHaveBeenCalled();
    });
  });

  describe("Send Functionality", () => {
    it("send() sends data when connection is OPEN", async () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitForConnection();

      expect(() => result.current.send(TEST_MESSAGE)).not.toThrow();
    });

    it("handles rapid send() calls", async () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitForConnection();

      const MESSAGE_1 = "Message 1";
      const MESSAGE_2 = "Message 2";
      const MESSAGE_3 = "Message 3";

      expect(() => {
        result.current.send(MESSAGE_1);
        result.current.send(MESSAGE_2);
        result.current.send(MESSAGE_3);
      }).not.toThrow();
    });
  });

  describe("Connection Lifecycle", () => {
    it("calls onClose on connection close", async () => {
      const onMessage = vi.fn();
      const onClose = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
          onClose,
        })
      );

      await waitForConnection();

      const clients = Array.from(chatWebSocket.clients);
      const client = clients[clients.length - 1];

      client.close();

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("cleanup closes connection on unmount", async () => {
      const onMessage = vi.fn();

      const { unmount } = renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
        })
      );

      await waitForConnection();

      expect(() => unmount()).not.toThrow();
    });

    it("reconnects when URL changes without reporting a close", async () => {
      const onMessage = vi.fn();
      const onClose = vi.fn();
      const INITIAL_URL = TEST_URL;
      const NEW_URL = "ws://localhost:8000/ws/api/v1/agent/new-agent";

      const { rerender } = renderHook(
        ({ url }) =>
          useWebSocketConnection({
            url,
            onMessage,
            onClose,
          }),
        { initialProps: { url: INITIAL_URL } }
      );

      await waitForConnection();

      rerender({ url: NEW_URL });

      await waitFor(() => {
        const clients = Array.from(chatWebSocket.clients);
        const hasNewUrl = clients.some((c) => c.url.toString() === NEW_URL);
        expect(hasNewUrl).toBe(true);
      });

      // The old socket's close is an intentional teardown, so it must not reach
      // onClose - consumers read that as a dropped connection and reconnect.
      expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps the new socket usable after a URL change", async () => {
      const onMessage = vi.fn();
      const NEW_URL = "ws://localhost:8000/ws/api/v1/agent/new-agent";
      const { received, waitForClose } = trackServerSockets();

      const { result, rerender } = renderHook(
        ({ url }) =>
          useWebSocketConnection({
            url,
            onMessage,
          }),
        { initialProps: { url: TEST_URL } }
      );

      await waitForConnection();

      rerender({ url: NEW_URL });

      // Wait for the old socket's close to be fully processed - that is the
      // moment the bug struck, nulling the ref that held the new socket and
      // silently turning send() into a no-op.
      await waitForClose(TEST_URL);

      result.current.send(TEST_MESSAGE);

      await waitFor(() => {
        expect(received).toContain(TEST_MESSAGE);
      });
    });

    it("handles null URL after having a connection", async () => {
      const onMessage = vi.fn();
      const onClose = vi.fn();
      const { waitForClose } = trackServerSockets();

      const { rerender } = renderHook(
        ({ url }: { url: string | null }) =>
          useWebSocketConnection({
            url,
            onMessage,
            onClose,
          }),
        { initialProps: { url: TEST_URL as string | null } }
      );

      await waitForConnection();

      rerender({ url: null });

      await waitForClose(TEST_URL);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not report a close when unmounted while still connecting", async () => {
      const onMessage = vi.fn();
      const onClose = vi.fn();
      const { waitForClose } = trackServerSockets();

      const { unmount } = renderHook(() =>
        useWebSocketConnection({
          url: TEST_URL,
          onMessage,
          onClose,
        })
      );

      // Unmount before the handshake completes: the browser reports 1006 here,
      // which would otherwise be scheduled for a reconnect.
      unmount();

      await waitForClose(TEST_URL);

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
