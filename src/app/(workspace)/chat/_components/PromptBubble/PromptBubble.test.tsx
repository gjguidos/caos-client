import { describe, expect, it } from "vitest";
import { render, screen, userEvent } from "@/test-utils/test-utils";
import { PromptBubble } from "./PromptBubble";
import type { ChatMsg } from "@/app/(workspace)/_types/chat.types";

const toolMessage = (
  overrides: Partial<ChatMsg["toolDisplay"]> = {}
): ChatMsg => ({
  sender: "user",
  text: '@writer --mode=write --text="A gaming chair"',
  toolDisplay: {
    toolName: "Writer Tool",
    prompt: "A gaming chair",
    fields: [
      { label: "mode", value: "write" },
      { label: "Max Character Length", value: "5000" },
    ],
    ...overrides,
  },
});

/** The page names every message from one pass; the bubble is handed the name. */
const renderBubble = (message: ChatMsg, source = "Writer Tool") =>
  render(<PromptBubble message={message} source={source} />);

describe("PromptBubble with a tool invocation", () => {
  it("shows what was typed as the message body", () => {
    renderBubble(toolMessage());
    expect(screen.getByText("A gaming chair")).toBeInTheDocument();
  });

  it("names the tool above the message", () => {
    renderBubble(toolMessage());
    expect(screen.getByText("Writer Tool")).toBeInTheDocument();
  });

  it("keeps the settings folded away, counted by the summary", () => {
    renderBubble(toolMessage());

    expect(screen.getByText("2 settings")).toBeInTheDocument();
    expect(screen.getByText("mode")).not.toBeVisible();
  });

  it("reveals the settings when the summary is opened", async () => {
    renderBubble(toolMessage());

    await userEvent.click(screen.getByText("2 settings"));

    expect(screen.getByText("mode")).toBeVisible();
    expect(screen.getByText("write")).toBeVisible();
  });

  it("counts a lone setting in the singular", () => {
    renderBubble(toolMessage({ fields: [{ label: "mode", value: "write" }] }));
    expect(screen.getByText("1 setting")).toBeInTheDocument();
  });

  it("shows no disclosure when the invocation carried no settings", () => {
    renderBubble(toolMessage({ fields: [] }));
    expect(screen.queryByText(/settings?$/)).not.toBeInTheDocument();
  });

  it("leaves no divider under the text when there are no settings", () => {
    const { container } = renderBubble(toolMessage({ fields: [] }));
    expect(container.querySelector(".border-t")).toBeNull();
  });

  it("renders no bubble when the invocation carried neither text nor settings", () => {
    renderBubble(toolMessage({ prompt: undefined, fields: [] }));
    expect(screen.queryByText("Writer Tool")).not.toBeInTheDocument();
  });
});

describe("PromptBubble in plain chat", () => {
  const plain: ChatMsg = { sender: "user", text: "just asking" };

  it("heads the message with its source rather than the agent", () => {
    renderBubble(plain, "Chat");

    expect(screen.getByText("just asking")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("carries no tool settings", () => {
    renderBubble(plain, "Chat");
    expect(screen.queryByText(/setting/)).not.toBeInTheDocument();
  });
});
