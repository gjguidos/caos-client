import type { AgentSummary } from "@/shared/lib/agent.types";
import { render, screen, within } from "@/test-utils/test-utils";
import { describe, expect, it, vi } from "vitest";
import { AgentCard } from "./AgentCard";

const agent = {
  id: "agent-1",
  name: "Planner",
  role_name: "assistant",
  tools: [],
  collections: [],
  personality_key: "friendly_assistant",
} as unknown as AgentSummary;

describe("AgentCard", () => {
  it("always links the card body at the agent's workspace, never the editor", () => {
    render(<AgentCard agent={agent} onDelete={vi.fn()} />, {
      auth: { canCreateAgent: true },
    });

    const card = screen.getByRole("article", { name: "Agent: Planner" });
    const href = card.querySelector("a")?.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).not.toContain("/edit");
  });

  it("names the workspace the card opens into", () => {
    render(<AgentCard agent={{ ...agent, type: "orchestration" }} />, {
      auth: { canCreateAgent: false },
    });

    const card = within(
      screen.getByRole("article", { name: "Agent: Planner" })
    );
    expect(card.getByText("Open canvas")).toBeInTheDocument();
  });

  it("offers edit and delete to builders, carrying the origin for the return trip", () => {
    render(<AgentCard agent={agent} onDelete={vi.fn()} />, {
      auth: { canCreateAgent: true },
      navigation: { pathname: "/" },
    });

    // The buttons name the action; the card they sit in names the agent, so
    // "Edit agent" is unambiguous to anyone navigating card by card.
    const card = within(
      screen.getByRole("article", { name: "Agent: Planner" })
    );
    expect(card.getByLabelText("Edit agent")).toBeInTheDocument();
    expect(card.getByLabelText("Delete agent")).toBeInTheDocument();
  });

  it("hides edit and delete from people who cannot build", () => {
    render(<AgentCard agent={agent} onDelete={vi.fn()} />, {
      auth: { canCreateAgent: false },
    });

    const card = within(
      screen.getByRole("article", { name: "Agent: Planner" })
    );
    expect(card.queryByLabelText("Edit agent")).not.toBeInTheDocument();
    expect(card.queryByLabelText("Delete agent")).not.toBeInTheDocument();
    // Details stays: it is information, not a build affordance.
    expect(card.getByLabelText("Agent details")).toBeInTheDocument();
  });
});
