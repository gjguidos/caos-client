import { listWorkflows } from "@/shared/api/fetch_workflows";
import type { AgentSummary } from "@/shared/lib/agent.types";
import { render, screen, waitFor } from "@/test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { AgentDetailsDialog } from "./AgentDetailsDialog";

vi.mock("@/shared/api/fetch_workflows", () => ({
  listWorkflows: vi.fn(),
}));

const mockListWorkflows = listWorkflows as Mock;

const preloadedState = {
  souls: [
    {
      key: "empty_eva",
      name: "Empty Eva",
      description: "Answers plainly and never embellishes.",
    },
  ],
  roles: [{ key: "analyst", name: "Analyst" }],
  agentTypes: [{ key: "assistant", name: "Assistant" }],
  tools: [
    { key: "web_search", name: "Web search" },
    { key: "rag", name: "RAG" },
  ],
  rulepacks: [
    {
      key: "safety",
      name: "Safety rules",
      metadata: {
        description: "Baseline safety.",
        rules: [{ id: "S1", description: "Never reveal secrets." }],
      },
    },
    { key: "tone", name: "Tone rules", metadata: { rules: [] } },
  ],
};

function buildState(overrides: Partial<typeof preloadedState> = {}) {
  const merged = { ...preloadedState, ...overrides };
  return {
    souls: { list: merged.souls },
    roles: { list: merged.roles },
    agentTypes: { list: merged.agentTypes },
    tools: { list: merged.tools },
    rulepacks: { list: merged.rulepacks },
  } as never;
}

const baseAgent: AgentSummary = {
  _id: "1",
  id: "1",
  name: "Aiden",
  system_name: "aiden",
  prompt: "",
  chat_url: "",
  role_name: "analyst",
  type: "assistant",
  personality_key: "empty_eva",
  llm_type: "gpt-4o",
  knowledge_db_type: "chroma",
  tools: [{ key: "web_search" }, { key: "rag" }],
  workflows: ["onboarding"],
  rule_pack_ids: ["safety", "tone"],
};

function renderDialog(
  agentData: AgentSummary | null = baseAgent,
  onClose = vi.fn(),
  state = buildState()
) {
  return {
    onClose,
    ...render(<AgentDetailsDialog agentData={agentData} onClose={onClose} />, {
      preloadedState: state,
    }),
  };
}

describe("AgentDetailsDialog", () => {
  beforeEach(() => {
    mockListWorkflows.mockReset();
    mockListWorkflows.mockResolvedValue([
      { key: "onboarding", name: "Onboarding", description: null },
    ]);
  });

  it("heads the panel with the agent name and description", async () => {
    renderDialog();

    const heading = await screen.findByRole("heading", { name: "Aiden" });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText("Answers plainly and never embellishes.")
    ).toBeInTheDocument();
    // The modal chrome carries no title of its own.
    expect(screen.queryByText(/Agent Details:/)).not.toBeInTheDocument();
  });

  it("falls back to a placeholder when the agent has no description", async () => {
    renderDialog({ ...baseAgent, personality_key: undefined });

    expect(
      await screen.findByText("No description available.")
    ).toBeInTheDocument();
  });

  it("shows the identity facts resolved from the registries", async () => {
    renderDialog();

    expect(await screen.findByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Assistant")).toBeInTheDocument();
    expect(screen.getByText("Analyst")).toBeInTheDocument();
    expect(screen.getByText("Empty Eva")).toBeInTheDocument();
  });

  it("renders every attached rule pack, not just the first", async () => {
    renderDialog();

    expect(await screen.findByText("Safety rules")).toBeInTheDocument();
    expect(screen.getByText("Tone rules")).toBeInTheDocument();
    expect(screen.getByText("Rule packs").textContent).toContain("(2)");
  });

  it("renders tool chips using their registry labels", async () => {
    renderDialog();

    expect(await screen.findByText("Web search")).toBeInTheDocument();
    expect(screen.getByText("RAG")).toBeInTheDocument();
  });

  it("marks a workflow that is missing from the catalog as stale", async () => {
    mockListWorkflows.mockResolvedValue([]);
    renderDialog();

    // "onboarding" renders from the key alone while the catalog is still
    // loading, so awaiting it proves nothing. The note is the only thing that
    // waits for the fetch to settle.
    expect(await screen.findByText("not in catalog")).toBeInTheDocument();
    expect(screen.getByText("onboarding")).toBeInTheDocument();
  });

  it("resolves workflow names from the catalog", async () => {
    renderDialog();

    await waitFor(() =>
      expect(screen.getByText("Onboarding")).toBeInTheDocument()
    );
    expect(screen.queryByText("not in catalog")).not.toBeInTheDocument();
  });

  it("lists configured cognitive modules and omits unset ones", async () => {
    renderDialog();

    expect(await screen.findByText("Knowledge base")).toBeInTheDocument();
    expect(screen.getByText("chroma")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.queryByText("Cache")).not.toBeInTheDocument();
    expect(screen.queryByText("Audio")).not.toBeInTheDocument();
  });

  it("shows an empty state per section when the agent has nothing attached", async () => {
    renderDialog({
      ...baseAgent,
      tools: [],
      workflows: [],
      rule_pack_ids: [],
      personality_key: undefined,
      type: undefined,
      role_name: null,
      llm_type: undefined,
      knowledge_db_type: undefined,
    });

    expect(
      await screen.findByText("No tools registered for this agent.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No workflows attached to this agent.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No rule packs attached to this agent.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No type, role or personality set.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No cognitive modules configured.")
    ).toBeInTheDocument();
  });

  it("shows a loading message when there is no agent yet", async () => {
    renderDialog(null);

    expect(
      await screen.findByText("Loading agent info...")
    ).toBeInTheDocument();
  });

  it("requests close when the close button is pressed", async () => {
    const onClose = vi.fn();
    renderDialog(baseAgent, onClose);

    const closeButtons = await screen.findAllByRole("button", {
      name: /close/i,
    });
    await userEvent.click(closeButtons[0]);

    expect(onClose).toHaveBeenCalled();
  });
});
