import * as getApiClient from "@/shared/lib/getApiClient";
import {
  chatWebSocket,
  closeAllConnections,
  createChatMessage,
  createLogMessage,
  simulateServerMessage,
  waitForConnection,
} from "@/test-utils/test-utils";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as wsTokenFetcher from "@/shared/websocket/wsTokenFetcher";
import { useAgentChat } from "./useAgentChat";

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

describe("useAgentChat", () => {
  const AGENT_SYSTEM_NAME = "test-agent-system";
  const AGENT_ID = "agent-123";
  const AGENT_NAME = "test-agent";
  const USER_ID = "user-456";
  const API_BASE = "https://api.example.com";
  const WS_TOKEN = "test-websocket-token";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getApiClient.default).mockReturnValue(API_BASE);
    vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockResolvedValue(WS_TOKEN);

    // Close all WebSocket connections
    closeAllConnections();
  });

  describe("Initial State", () => {
    it("starts with empty messages and input", () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      expect(result.current.chatMessages).toEqual([]);
      expect(result.current.serverMessages).toEqual([]);
      expect(result.current.inputText).toBe("");
      expect(result.current.isThinking).toBe(false);
    });

    it("starts with canChat false before connection", () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      expect(result.current.canChat).toBe(false);
    });
  });

  describe("Connection Integration", () => {
    it("establishes WebSocket connection automatically", async () => {
      renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );
      await waitForConnection();
    });

    it("sets canChat to true when connected", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("does not connect when enabled is false", async () => {
      const initialClientCount = chatWebSocket.clients.size;

      renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
          enabled: false,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(chatWebSocket.clients.size).toBe(initialClientCount);
    });
  });

  describe("Message Receiving", () => {
    it("adds agent messages to chat when receiving chat messages", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const CHAT_TEXT = "Hello from agent";

      const message = createChatMessage(CHAT_TEXT, {
        agentSystemName: AGENT_SYSTEM_NAME,
      });
      simulateServerMessage(message);

      await waitFor(() => {
        expect(result.current.chatMessages).toHaveLength(1);
      });

      expect(result.current.chatMessages[0]).toEqual({
        sender: "agent",
        text: CHAT_TEXT,
      });
    });

    it("adds log messages to server messages", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const LOG_MESSAGE = "Processing...";

      const logMsg = createLogMessage(LOG_MESSAGE);
      simulateServerMessage(logMsg);

      await waitFor(() => {
        expect(result.current.serverMessages).toContain(LOG_MESSAGE);
      });
    });

    it("sets isThinking to false when receiving chat response", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      act(() => {
        result.current.setInputText("Hello");
      });

      act(() => {
        result.current.sendMessage();
      });

      await waitFor(() => {
        expect(result.current.isThinking).toBe(true);
      });

      const message = createChatMessage("Response", {
        agentSystemName: AGENT_SYSTEM_NAME,
      });
      simulateServerMessage(message);

      await waitFor(() => {
        expect(result.current.isThinking).toBe(false);
      });
    });

    it("handles chat messages with empty renderables", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const message = JSON.stringify({
        event: `${AGENT_SYSTEM_NAME}.comm`,
        response: {
          message: {
            renderables: [], // Empty renderables produce a JSON fallback string
          },
        },
      });
      simulateServerMessage(message);

      // Empty renderables fall through to JSON.stringify in extractReplyText,
      // producing non-null text that lands in chatMessages (not serverMessages)
      await waitFor(() => {
        expect(result.current.chatMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Message Sending", () => {
    it("sends message when canChat is true", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      const USER_MESSAGE = "Hello agent";

      act(() => {
        result.current.setInputText(USER_MESSAGE);
      });

      act(() => {
        result.current.sendMessage();
      });

      await waitFor(() => {
        expect(result.current.chatMessages).toHaveLength(1);
      });

      expect(result.current.chatMessages[0]).toEqual({
        sender: "user",
        text: USER_MESSAGE,
      });
    });

    it("clears input text after sending", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      act(() => {
        result.current.setInputText("Hello");
      });

      act(() => {
        result.current.sendMessage();
      });

      await waitFor(() => {
        expect(result.current.inputText).toBe("");
      });
    });

    it("sets isThinking to true after sending", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      act(() => {
        result.current.setInputText("Hello");
      });

      act(() => {
        result.current.sendMessage();
      });

      await waitFor(() => {
        expect(result.current.isThinking).toBe(true);
      });
    });

    it("does not send empty messages", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      const initialMessageCount = result.current.chatMessages.length;

      act(() => {
        result.current.setInputText("   ");
      });

      act(() => {
        result.current.sendMessage();
      });

      expect(result.current.chatMessages).toHaveLength(initialMessageCount);
    });

    it("shows error message when not connected", () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
          enabled: false,
        })
      );

      act(() => {
        result.current.setInputText("Hello");
      });

      act(() => {
        result.current.sendMessage();
      });

      expect(result.current.serverMessages).toContain(
        "Connection not ready. Please wait a moment and try again."
      );
    });

    it("trims whitespace from messages", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      act(() => {
        result.current.setInputText("  Hello  ");
      });

      act(() => {
        result.current.sendMessage();
      });

      await waitFor(() => {
        expect(result.current.chatMessages[0].text).toBe("Hello");
      });
    });
  });

  describe("Clear Messages", () => {
    it("clears all messages", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      await waitFor(() => {
        expect(result.current.canChat).toBe(true);
      });

      act(() => {
        result.current.setInputText("Hello");
      });

      act(() => {
        result.current.sendMessage();
      });

      await waitFor(() => {
        expect(result.current.chatMessages.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.chatMessages).toEqual([]);
      expect(result.current.serverMessages).toEqual([]);
    });
  });

  describe("Input Text Management", () => {
    it("allows setting input text", () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
        })
      );

      const NEW_TEXT = "Hello world";

      act(() => {
        result.current.setInputText(NEW_TEXT);
      });

      expect(result.current.inputText).toBe(NEW_TEXT);
    });
  });

  describe("CanChat Derived State", () => {
    it("returns false when not connected", () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: USER_ID,
          enabled: false,
        })
      );

      expect(result.current.canChat).toBe(false);
    });

    it("returns false when agentName is missing", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: "",
          userId: USER_ID,
        })
      );

      // Even if we wait, canChat should remain false
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result.current.canChat).toBe(false);
    });

    it("returns false when userId is missing", async () => {
      const { result } = renderHook(() =>
        useAgentChat({
          agentSystemName: AGENT_SYSTEM_NAME,
          agentId: AGENT_ID,
          agentName: AGENT_NAME,
          userId: "",
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // But canChat should still be false
      expect(result.current.canChat).toBe(false);
    });
  });
});
