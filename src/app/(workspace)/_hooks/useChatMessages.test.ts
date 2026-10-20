import { renderHook, act } from "@/test-utils/test-utils";
import { describe, expect, it } from "vitest";
import { useChatMessages } from "./useChatMessages";

describe("useChatMessages", () => {
  const USER_MESSAGE = "Hello from user";
  const AGENT_MESSAGE = "Hello from agent";
  const SERVER_MESSAGE = "Server log message";
  const MESSAGE_1 = "First message";
  const MESSAGE_2 = "Second message";
  const MESSAGE_3 = "Third message";
  const LOG_1 = "Log 1";
  const LOG_2 = "Log 2";
  const LOG_3 = "Log 3";
  const EMPTY_STRING = "";
  const WHITESPACE = "   \n\t  ";
  const SPECIAL_CHARS = "Hello <>&\"' 测试 🤖";
  const LONG_MESSAGE = "A".repeat(10000);
  const LONG_MESSAGE_LENGTH = 10000;
  const CHAT_1 = "Chat 1";
  const CHAT_2 = "Chat 2";
  const SERVER_1 = "Server 1";
  const SERVER_2 = "Server 2";
  const EMPTY_ARRAY: never[] = [];
  const EXPECTED_LENGTH_2 = 2;
  const EXPECTED_LENGTH_3 = 3;
  const EXPECTED_LENGTH_1 = 1;

  it("initializes with empty message arrays", () => {
    const { result } = renderHook(() => useChatMessages());

    expect(result.current.chatMessages).toEqual(EMPTY_ARRAY);
    expect(result.current.serverMessages).toEqual(EMPTY_ARRAY);
  });

  it("adds user message with sender 'user'", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_RESULT = [{ sender: "user", text: USER_MESSAGE }];

    act(() => {
      result.current.addUserMessage(USER_MESSAGE);
    });

    expect(result.current.chatMessages).toEqual(EXPECTED_RESULT);
  });

  it("adds agent message with sender 'agent'", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_RESULT = [{ sender: "agent", text: AGENT_MESSAGE }];

    act(() => {
      result.current.addAgentMessage(AGENT_MESSAGE);
    });

    expect(result.current.chatMessages).toEqual(EXPECTED_RESULT);
  });

  it("adds server message to serverMessages array", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_SERVER_MESSAGES = [SERVER_MESSAGE];

    act(() => {
      result.current.addServerMessage(SERVER_MESSAGE);
    });

    expect(result.current.serverMessages).toEqual(EXPECTED_SERVER_MESSAGES);
    expect(result.current.chatMessages).toEqual(EMPTY_ARRAY);
  });

  it("clearMessages clears both arrays", () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.addUserMessage(USER_MESSAGE);
      result.current.addAgentMessage(AGENT_MESSAGE);
      result.current.addServerMessage(SERVER_MESSAGE);
    });

    expect(result.current.chatMessages).toHaveLength(EXPECTED_LENGTH_2);
    expect(result.current.serverMessages).toHaveLength(EXPECTED_LENGTH_1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.chatMessages).toEqual(EMPTY_ARRAY);
    expect(result.current.serverMessages).toEqual(EMPTY_ARRAY);
  });

  it("maintains message order", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_ORDER = [
      { sender: "user", text: MESSAGE_1 },
      { sender: "agent", text: MESSAGE_2 },
      { sender: "user", text: MESSAGE_3 },
    ];

    act(() => {
      result.current.addUserMessage(MESSAGE_1);
      result.current.addAgentMessage(MESSAGE_2);
      result.current.addUserMessage(MESSAGE_3);
    });

    expect(result.current.chatMessages).toEqual(EXPECTED_ORDER);
  });

  it("accumulates messages with multiple calls", () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.addUserMessage(MESSAGE_1);
      result.current.addUserMessage(MESSAGE_2);
      result.current.addUserMessage(MESSAGE_3);
    });

    expect(result.current.chatMessages).toHaveLength(EXPECTED_LENGTH_3);
  });

  it("accumulates server messages with multiple calls", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_SERVER_MESSAGES = [LOG_1, LOG_2, LOG_3];

    act(() => {
      result.current.addServerMessage(LOG_1);
      result.current.addServerMessage(LOG_2);
      result.current.addServerMessage(LOG_3);
    });

    expect(result.current.serverMessages).toEqual(EXPECTED_SERVER_MESSAGES);
  });

  it("handles empty string messages", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_CHAT_MESSAGES = [
      { sender: "user", text: EMPTY_STRING },
      { sender: "agent", text: EMPTY_STRING },
    ];
    const EXPECTED_SERVER_MESSAGES = [EMPTY_STRING];

    act(() => {
      result.current.addUserMessage(EMPTY_STRING);
      result.current.addAgentMessage(EMPTY_STRING);
      result.current.addServerMessage(EMPTY_STRING);
    });

    expect(result.current.chatMessages).toEqual(EXPECTED_CHAT_MESSAGES);
    expect(result.current.serverMessages).toEqual(EXPECTED_SERVER_MESSAGES);
  });

  it("handles whitespace-only messages", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_RESULT = [{ sender: "user", text: WHITESPACE }];

    act(() => {
      result.current.addUserMessage(WHITESPACE);
    });

    expect(result.current.chatMessages).toEqual(EXPECTED_RESULT);
  });

  it("handles special characters in messages", () => {
    const { result } = renderHook(() => useChatMessages());
    const EXPECTED_RESULT = [{ sender: "user", text: SPECIAL_CHARS }];

    act(() => {
      result.current.addUserMessage(SPECIAL_CHARS);
    });

    expect(result.current.chatMessages).toEqual(EXPECTED_RESULT);
  });

  it("handles very long messages", () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.addUserMessage(LONG_MESSAGE);
    });

    expect(result.current.chatMessages[0].text).toHaveLength(
      LONG_MESSAGE_LENGTH
    );
  });

  it("maintains separate state for chat and server messages", () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.addUserMessage(CHAT_1);
      result.current.addServerMessage(SERVER_1);
      result.current.addAgentMessage(CHAT_2);
      result.current.addServerMessage(SERVER_2);
    });

    expect(result.current.chatMessages).toHaveLength(EXPECTED_LENGTH_2);
    expect(result.current.serverMessages).toHaveLength(EXPECTED_LENGTH_2);
    expect(result.current.chatMessages[0].text).toBe(CHAT_1);
    expect(result.current.serverMessages[0]).toBe(SERVER_1);
  });

  it("callback functions have stable references", () => {
    const { result, rerender } = renderHook(() => useChatMessages());

    const FIRST_RENDER_CALLBACKS = {
      addUserMessage: result.current.addUserMessage,
      addAgentMessage: result.current.addAgentMessage,
      addServerMessage: result.current.addServerMessage,
      clearMessages: result.current.clearMessages,
    };

    rerender();

    expect(result.current.addUserMessage).toBe(
      FIRST_RENDER_CALLBACKS.addUserMessage
    );
    expect(result.current.addAgentMessage).toBe(
      FIRST_RENDER_CALLBACKS.addAgentMessage
    );
    expect(result.current.addServerMessage).toBe(
      FIRST_RENDER_CALLBACKS.addServerMessage
    );
    expect(result.current.clearMessages).toBe(
      FIRST_RENDER_CALLBACKS.clearMessages
    );
  });
});
