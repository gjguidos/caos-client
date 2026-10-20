import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, userEvent } from "@/test-utils/test-utils";
import { ToolSelector } from "./ToolSelector";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";

const tool = (key: string, label: string): EnrichedTool => ({
  key,
  label,
  description: "",
  version: "1",
  trigger_words: [],
});

// `writer_tool` has an icon override, `summarizer` does not - neither is named
// by anything but its registry label.
const tools = [
  tool("writer_tool", "Writer Assistant"),
  tool("summarizer", "Summarizer"),
];

/** Mirrors how the chat page drives the selector: it owns the selected key. */
function Harness({ initialKey = null }: { initialKey?: string | null }) {
  const [currentToolKey, setCurrentToolKey] = useState<string | null>(
    initialKey
  );
  const currentTool = tools.find((t) => t.key === currentToolKey) ?? null;

  return (
    <ToolSelector
      tools={tools}
      currentTool={currentTool}
      onSelect={setCurrentToolKey}
    />
  );
}

/** The selected-tool pill, which the menu also renders a same-named item for. */
const pill = () => document.querySelector<HTMLButtonElement>("button.pill");

describe("ToolSelector", () => {
  it("shows no pill in plain chat mode", () => {
    render(<Harness />);
    expect(pill()).toBeNull();
  });

  it("names the selected tool by its registry label, icon override or not", () => {
    render(<Harness initialKey="writer_tool" />);
    expect(pill()).toHaveTextContent("Writer Assistant");
  });

  it("names a tool with no icon config the same way", () => {
    render(<Harness initialKey="summarizer" />);
    expect(pill()).toHaveTextContent("Summarizer");
  });

  it("stays dismissed after the pill is closed", async () => {
    render(<Harness initialKey="writer_tool" />);
    const selectedPill = pill();
    expect(selectedPill).not.toBeNull();

    await userEvent.click(selectedPill as HTMLButtonElement);

    expect(pill()).toBeNull();
  });

  it("selects a tool from the menu", async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole("button", { name: "Tools" }));
    await userEvent.click(screen.getByText("Summarizer"));

    expect(pill()).toHaveTextContent("Summarizer");
  });
});
