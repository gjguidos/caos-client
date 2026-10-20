import * as getApiClient from "@/shared/lib/getApiClient";
import {
  chatWebSocket,
  closeAllConnections,
  createChatMessage,
  simulateServerMessage,
  waitForConnection,
} from "@/test-utils/test-utils";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as wsTokenFetcher from "@/shared/websocket/wsTokenFetcher";
import { useAgentWebSocket } from "./useAgentWebSocket";

vi.mock("@/shared/websocket/wsTokenFetcher");
vi.mock("@/shared/lib/getApiClient");
vi.mock("@/shared/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("useAgentWebSocket", () => {
  const AGENT_SYSTEM_NAME = "test-agent-system";
  const AGENT_NAME = "test-agent";
  const API_BASE = "https://api.example.com";
  const WS_TOKEN = "test-websocket-token";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiClient.default).mockReturnValue(API_BASE);
    vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockResolvedValue(WS_TOKEN);

    closeAllConnections();
  });

  describe("Initial State", () => {
    it("starts with idle connection state when disabled", () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          enabled: false, // Disabled so it stays idle
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      expect(result.current.connectionState).toBe("idle");
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("Connection Flow", () => {
    it("connects automatically when enabled", async () => {
      const MOCK_ON_MESSAGE = vi.fn();
      const MOCK_ON_CONNECTION_CHANGE = vi.fn();

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
          onConnectionChange: MOCK_ON_CONNECTION_CHANGE,
        })
      );

      await waitFor(() => {
        expect(MOCK_ON_CONNECTION_CHANGE).toHaveBeenCalledWith("connecting");
      });

      await waitForConnection();

      await waitFor(() => {
        expect(MOCK_ON_CONNECTION_CHANGE).toHaveBeenCalledWith("connected");
      });
    });

    it("fetches WebSocket token during connection", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      await waitFor(() => {
        expect(wsTokenFetcher.fetchWebSocketToken).toHaveBeenCalled();
      });
    });

    it("does not connect when enabled is false", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const initialClientCount = chatWebSocket.clients.size;

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          enabled: false,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      // Wait a bit to ensure no connection is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wsTokenFetcher.fetchWebSocketToken).not.toHaveBeenCalled();
      // No new connections should be created
      expect(chatWebSocket.clients.size).toBe(initialClientCount);
    });

    it("handles missing API base configuration", async () => {
      vi.mocked(getApiClient.default).mockReturnValue("");

      const MOCK_ON_MESSAGE = vi.fn();
      const MOCK_ON_LOG = vi.fn();
      const MOCK_ON_CONNECTION_CHANGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
          onLog: MOCK_ON_LOG,
          onConnectionChange: MOCK_ON_CONNECTION_CHANGE,
        })
      );

      await waitFor(() => {
        expect(MOCK_ON_LOG).toHaveBeenCalledWith(
          "Missing API base configuration (NEXT_PUBLIC_API_BASE)."
        );
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe("error");
      });
    });

    it("handles token fetch failure", async () => {
      vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockResolvedValue(null);

      const MOCK_ON_MESSAGE = vi.fn();
      const MOCK_ON_LOG = vi.fn();
      const MOCK_ON_CONNECTION_CHANGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
          onLog: MOCK_ON_LOG,
          onConnectionChange: MOCK_ON_CONNECTION_CHANGE,
        })
      );

      await waitFor(() => {
        expect(MOCK_ON_LOG).toHaveBeenCalledWith(
          "Failed to authenticate for WebSocket connection"
        );
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe("error");
      });
    });
  });

  describe("Message Handling", () => {
    it("parses and forwards chat messages", async () => {
      const MOCK_ON_MESSAGE = vi.fn();
      const MOCK_ON_CONNECTION_CHANGE = vi.fn();
      const CHAT_TEXT = "Hello from agent";

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
          onConnectionChange: MOCK_ON_CONNECTION_CHANGE,
        })
      );

      await waitFor(() => {
        expect(MOCK_ON_CONNECTION_CHANGE).toHaveBeenCalledWith("connected");
      });

      const message = createChatMessage(CHAT_TEXT, {
        agentSystemName: AGENT_SYSTEM_NAME,
      });
      simulateServerMessage(message);

      await waitFor(() => {
        expect(MOCK_ON_MESSAGE).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "chat",
            text: CHAT_TEXT,
          })
        );
      });
    });

    it("handles log messages separately", async () => {
      const MOCK_ON_MESSAGE = vi.fn();
      const MOCK_ON_LOG = vi.fn();
      const LOG_MESSAGE = "Processing request...";

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
          onLog: MOCK_ON_LOG,
        })
      );

      await waitForConnection();

      const logMessage = JSON.stringify({
        type: "log",
        message: LOG_MESSAGE,
      });
      simulateServerMessage(logMessage);

      await waitFor(() => {
        expect(MOCK_ON_LOG).toHaveBeenCalledWith(LOG_MESSAGE);
      });

      expect(MOCK_ON_MESSAGE).not.toHaveBeenCalled();
    });

    it("handles unknown message types", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      await waitForConnection();

      const unknownMessage = JSON.stringify({
        type: "unknown",
        data: "some data",
      });
      simulateServerMessage(unknownMessage);

      await waitFor(() => {
        expect(MOCK_ON_MESSAGE).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "other",
          })
        );
      });
    });

    it("handles non-JSON messages", async () => {
      const MOCK_ON_MESSAGE = vi.fn();
      const TEXT_MESSAGE = "plain text message";

      renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      await waitForConnection();

      simulateServerMessage(TEXT_MESSAGE);

      await waitFor(() => {
        expect(MOCK_ON_MESSAGE).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "other",
            text: TEXT_MESSAGE,
            raw: TEXT_MESSAGE,
          })
        );
      });
    });
  });

  describe("Send Functionality", () => {
    it("sends messages when connected", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      await waitForConnection();

      const PAYLOAD = { action: "test", data: "hello" };

      expect(() => result.current.send(PAYLOAD)).not.toThrow();
    });
  });

  describe("Disconnect Functionality", () => {
    it("disconnects and calls onConnectionChange callback", async () => {
      const MOCK_ON_MESSAGE = vi.fn();
      const MOCK_ON_CONNECTION_CHANGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
          onConnectionChange: MOCK_ON_CONNECTION_CHANGE,
        })
      );

      await waitForConnection();

      MOCK_ON_CONNECTION_CHANGE.mockClear();

      expect(() => result.current.disconnect()).not.toThrow();

      await waitFor(() => {
        expect(MOCK_ON_CONNECTION_CHANGE).toHaveBeenCalledWith("disconnected");
      });
    });

    it("stays disconnected instead of immediately reconnecting", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      await waitForConnection();

      vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockClear();

      result.current.disconnect();

      // The socket teardown is what a re-firing init effect would follow, so
      // once the state has settled there a reconnect would already be in
      // flight - no token fetch means the effect stayed put.
      await waitFor(() => {
        expect(result.current.connectionState).toBe("disconnected");
      });

      expect(wsTokenFetcher.fetchWebSocketToken).not.toHaveBeenCalled();
    });
  });

  describe("Server-Initiated Close", () => {
    it("reports disconnected when the server drops the connection", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      await waitFor(() => {
        expect(result.current.connectionState).toBe("connected");
      });

      closeAllConnections();

      await waitFor(() => {
        expect(result.current.connectionState).toBe("disconnected");
      });
    });
  });

  describe("IsConnected Derived State", () => {
    it("returns true when connectionState is connected", async () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      expect(result.current.isConnected).toBe(false);

      await waitFor(() => {
        expect(result.current.connectionState).toBe("connected");
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("returns false for non-connected states", () => {
      const MOCK_ON_MESSAGE = vi.fn();

      const { result } = renderHook(() =>
        useAgentWebSocket({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentName: AGENT_NAME,
          enabled: false, // Start disabled so it stays idle
          onMessage: MOCK_ON_MESSAGE,
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe("idle");
    });
  });

  describe("Callback Stability", () => {
    it("allows onMessage to be updated without reconnecting", async () => {
      const MOCK_ON_MESSAGE_1 = vi.fn();
      const MOCK_ON_MESSAGE_2 = vi.fn();

      // Track client count before rendering so waitForConnection waits for
      // THIS hook's connection specifically, not a stale one from a prior test.
      const countBefore = chatWebSocket.clients.size;

      const { rerender } = renderHook(
        ({ onMessage }) =>
          useAgentWebSocket({
            agentSystemName: AGENT_SYSTEM_NAME,
            agentName: AGENT_NAME,
            onMessage,
          }),
        { initialProps: { onMessage: MOCK_ON_MESSAGE_1 } }
      );

      await waitFor(() => {
        expect(chatWebSocket.clients.size).toBeGreaterThan(countBefore);
      });

      const clientCountBefore = chatWebSocket.clients.size;

      rerender({ onMessage: MOCK_ON_MESSAGE_2 });

      expect(chatWebSocket.clients.size).toBe(clientCountBefore);

      // Send message - should use new callback
      const message = createChatMessage("Test", {
        agentSystemName: AGENT_SYSTEM_NAME,
      });
      simulateServerMessage(message);

      await waitFor(() => {
        expect(MOCK_ON_MESSAGE_2).toHaveBeenCalled();
      });

      expect(MOCK_ON_MESSAGE_1).not.toHaveBeenCalled();
    });
  });
});
