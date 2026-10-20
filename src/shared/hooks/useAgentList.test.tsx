import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentSummary } from "@/shared/lib/agent.types";
import { AgentListProvider, useAgentList } from "./useAgentList";

const fetchAgents = vi.fn();
const deleteAgent = vi.fn();

vi.mock("@/shared/api/fetch_agents", () => ({
  fetchAgents: (...args: unknown[]) => fetchAgents(...args),
  fetchAgentById: vi.fn(),
}));

vi.mock("@/shared/api/delete_agents", () => ({
  deleteAgent: (...args: unknown[]) => deleteAgent(...args),
}));

const agent = (id: string, name: string) =>
  ({ id, name, prompt: "", role_name: null }) as AgentSummary;

/** Stands in for a surface that reads the list, e.g. the rail or the catalog. */
function AgentNames({ label }: { label: string }) {
  const { agents } = useAgentList();
  return <div data-testid={label}>{agents.map((a) => a.name).join(",")}</div>;
}

function DeleteButton() {
  const { handleDelete } = useAgentList();
  return <button onClick={() => handleDelete("a1")}>delete</button>;
}

describe("useAgentList", () => {
  let agents: AgentSummary[];

  beforeEach(() => {
    agents = [agent("a1", "Planner"), agent("a2", "Researcher")];
    fetchAgents.mockReset();
    fetchAgents.mockImplementation(async () => ({ data: [...agents] }));
    deleteAgent.mockReset();
    deleteAgent.mockImplementation(async (id: string) => {
      agents = agents.filter((a) => a.id !== id);
    });
  });

  // The rail and the catalog used to hold a copy each, which meant two requests
  // for one collection and two chances to disagree about what is in it.
  it("serves every consumer from a single fetch", async () => {
    render(
      <AgentListProvider>
        <AgentNames label="rail" />
        <AgentNames label="catalog" />
      </AgentListProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("rail")).toHaveTextContent("Planner,Researcher")
    );
    expect(screen.getByTestId("catalog")).toHaveTextContent(
      "Planner,Researcher"
    );
    expect(fetchAgents).toHaveBeenCalledOnce();
  });

  it("shows a delete to every consumer at once", async () => {
    render(
      <AgentListProvider>
        <AgentNames label="rail" />
        <AgentNames label="catalog" />
        <DeleteButton />
      </AgentListProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("rail")).toHaveTextContent("Planner")
    );

    await act(async () => {
      screen.getByRole("button", { name: "delete" }).click();
    });

    expect(screen.getByTestId("rail")).toHaveTextContent("Researcher");
    expect(screen.getByTestId("rail")).not.toHaveTextContent("Planner");
    expect(screen.getByTestId("catalog")).not.toHaveTextContent("Planner");
  });

  it("fails loudly when a consumer is mounted outside the provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<AgentNames label="orphan" />)).toThrow(
      /AgentListProvider/
    );

    error.mockRestore();
  });
});
