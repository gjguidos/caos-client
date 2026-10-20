import { describe, expect, it } from "vitest";
import { messageOrigins } from "./messageOrigins";
import type { ChatMsg } from "@/app/(workspace)/_types/chat.types";

const user = (text: string, toolName?: string): ChatMsg => ({
  sender: "user",
  text,
  ...(toolName
    ? { toolDisplay: { toolName, prompt: text, fields: [] } }
    : undefined),
});

const agent = (text: string): ChatMsg => ({ sender: "agent", text });

describe("messageOrigins", () => {
  it("calls it plain chat when the request used no tool", () => {
    const origins = messageOrigins([user("hello"), agent("hi")]);
    expect(origins[0].source).toBe("Chat");
    expect(origins[1].source).toBe("Chat");
  });

  it("names the tool the request was sent through", () => {
    const messages = [user("a chair", "Writer Tool"), agent("A chair is...")];
    const origins = messageOrigins(messages);
    expect(origins[0].source).toBe("Writer Tool");
    expect(origins[1].source).toBe("Writer Tool");
  });

  it("tracks the tool changing down a conversation", () => {
    const messages = [
      user("a chair", "Writer Tool"),
      agent("A chair is..."),
      user("more ideas", "Ideation Tool"),
      agent("Here are ideas"),
      user("plain question"),
      agent("plain answer"),
    ];

    const origins = messageOrigins(messages);

    expect(origins[1].source).toBe("Writer Tool");
    expect(origins[3].source).toBe("Ideation Tool");
    expect(origins[5].source).toBe("Chat");
  });

  it("carries the tool across intervening agent messages", () => {
    const messages = [
      user("a chair", "Writer Tool"),
      agent("thinking"),
      agent("A chair is..."),
    ];
    expect(messageOrigins(messages)[2].source).toBe("Writer Tool");
  });

  it("falls back to plain chat when nothing precedes the message", () => {
    const origins = messageOrigins([agent("unprompted")]);
    expect(origins[0].source).toBe("Chat");
    expect(origins[0].requestText).toBeUndefined();
  });

  it("carries the text of the request that produced the message", () => {
    const messages = [
      user("analyse this claim", "Green Claim Tool"),
      agent("report"),
    ];
    expect(messageOrigins(messages)[1].requestText).toBe("analyse this claim");
  });

  it("keeps the request text across intervening agent messages", () => {
    const messages = [
      user("analyse this claim", "Green Claim Tool"),
      agent("thinking"),
      agent("report"),
    ];
    expect(messageOrigins(messages)[2].requestText).toBe("analyse this claim");
  });
});
