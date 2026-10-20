import { render, screen } from "@/test-utils/test-utils";
import { describe, expect, it, vi } from "vitest";
import { GlobalPanel } from "./GlobalPanel";

vi.mock("@/shared/hooks/useAgentList", () => ({
  useAgentList: () => ({
    agents: [
      { id: "a1", name: "Planner", system_name: "planner" },
      { id: "a2", name: "Researcher", system_name: "researcher" },
    ],
    loading: false,
  }),
}));

describe("GlobalPanel", () => {
  it("lists agents under a heading that links to the agent catalog", () => {
    render(<GlobalPanel isAgentRoute={false} agentId={null} />, {
      auth: { canCreateAgent: false },
      navigation: { pathname: "/chat/planner/a1" },
    });

    expect(screen.getByRole("button", { name: "Planner" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agents" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("shows the Workflows entry only to builders", () => {
    render(<GlobalPanel isAgentRoute={false} agentId={null} />, {
      auth: { canCreateAgent: true },
      navigation: { pathname: "/" },
    });

    expect(screen.getByRole("link", { name: "Workflows" })).toHaveAttribute(
      "href",
      "/workflows"
    );
  });

  // Workflows are run indirectly via an orchestration agent, so a non-builder
  // would only get a catalog of things they cannot act on.
  it("hides workflows from people who cannot build", () => {
    render(<GlobalPanel isAgentRoute={false} agentId={null} />, {
      auth: { canCreateAgent: false },
      navigation: { pathname: "/" },
    });

    expect(
      screen.queryByRole("link", { name: "Workflows" })
    ).not.toBeInTheDocument();
  });

  it("keeps the agent list visible while the workflow builder is open", () => {
    render(<GlobalPanel isAgentRoute={false} agentId={null} />, {
      auth: { canCreateAgent: true },
      navigation: { pathname: "/workflows/wf-1" },
    });

    // No workflow rows to carry the active state, so the section entry holds it
    // for every route beneath it.
    expect(screen.getByRole("link", { name: "Workflows" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Agents" })).not.toHaveAttribute(
      "aria-current"
    );
    expect(screen.getByRole("button", { name: "Planner" })).toBeInTheDocument();
  });

  it("marks the open agent's row, not the agents heading", () => {
    render(<GlobalPanel isAgentRoute agentId="a2" />, {
      auth: { canCreateAgent: false },
      navigation: { pathname: "/chat/researcher/a2" },
    });

    expect(screen.getByRole("button", { name: "Researcher" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "Planner" })).not.toHaveAttribute(
      "aria-current"
    );
    expect(screen.getByRole("link", { name: "Agents" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
