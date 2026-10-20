import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils/test-utils";
import { BuilderPalette } from "./BuilderPalette";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";

const tools: ToolDefinition[] = [
  { key: "Writer", name: "Writer", description: "", version: "1" },
  { key: "Summarizer", name: "Summarizer", description: "", version: "1" },
];

function renderPalette() {
  return render(<BuilderPalette onAdd={vi.fn()} />, {
    preloadedState: { tools: { list: tools } },
  });
}

describe("BuilderPalette search", () => {
  it("lists all tools and the tool count by default", () => {
    renderPalette();
    expect(screen.getByText("Writer")).toBeInTheDocument();
    expect(screen.getByText("Summarizer")).toBeInTheDocument();
    expect(screen.getByText("Tools (2)")).toBeInTheDocument();
  });

  it("filters tools by the search query (case-insensitive)", async () => {
    renderPalette();
    await userEvent.type(screen.getByLabelText("Search steps"), "writ");
    expect(screen.getByText("Writer")).toBeInTheDocument();
    expect(screen.queryByText("Summarizer")).not.toBeInTheDocument();
    expect(screen.getByText("Tools (1)")).toBeInTheDocument();
  });

  it("shows a no-matches line when nothing matches", async () => {
    renderPalette();
    await userEvent.type(screen.getByLabelText("Search steps"), "zzz");
    expect(screen.getByText(/No steps match/)).toBeInTheDocument();
  });

  it("filters control steps too", async () => {
    renderPalette();
    await userEvent.type(screen.getByLabelText("Search steps"), "pause");
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.queryByText("Writer")).not.toBeInTheDocument();
  });

  it("restores the full lists when the search is cleared", async () => {
    renderPalette();
    await userEvent.type(screen.getByLabelText("Search steps"), "writ");
    expect(screen.queryByText("Summarizer")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText("Summarizer")).toBeInTheDocument();
    expect(screen.getByText("Tools (2)")).toBeInTheDocument();
  });
});
