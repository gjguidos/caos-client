import { agentFormDefaults } from "@/app/agents/_components/CreateAgentForm/agentForm";
import { Form } from "@/app/agents/_components/Form/Form";
import { fetchRegistryEntry } from "@/shared/api/fetch_registries";
import { AgentFormValues } from "@/shared/lib/agent.types";
import { render, screen, waitFor } from "@/test-utils/test-utils";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import BasicSection from "./BasicSection";

vi.mock("@/shared/api/fetch_registries", () => ({
  fetchRegistryEntry: vi.fn(),
}));

const mockFetchRegistryEntry = fetchRegistryEntry as Mock;

function Harness({ defaults }: { defaults?: Partial<AgentFormValues> }) {
  const form = useForm<AgentFormValues>({
    defaultValues: { ...agentFormDefaults, ...defaults },
  });
  return (
    <Form {...form}>
      <BasicSection form={form} />
    </Form>
  );
}

const agentTypesState = {
  agentTypes: {
    list: [
      {
        key: "chat",
        name: "Chat",
        description: "Conversational agent",
      },
      {
        key: "research",
        name: "Research",
        description: "Deep research agent",
      },
    ],
  },
};

describe("BasicSection", () => {
  beforeEach(() => {
    mockFetchRegistryEntry.mockReset();
    mockFetchRegistryEntry.mockResolvedValue({});
  });

  it("renders the agent type field sourced from the store registry", () => {
    render(<Harness defaults={{ type: "" }} />, {
      preloadedState: agentTypesState,
    });

    expect(screen.getByText("Agent type")).toBeInTheDocument();
    expect(screen.getByText("Select agent type")).toBeInTheDocument();
  });

  it("leaves the rule pack to the Behaviour step", () => {
    render(<Harness defaults={{ type: "" }} />, {
      preloadedState: agentTypesState,
    });

    expect(screen.queryByText("Rule pack")).not.toBeInTheDocument();
  });

  it("loads the config for the selected type on mount (watches `type`)", async () => {
    render(<Harness defaults={{ type: "research" }} />, {
      preloadedState: agentTypesState,
    });

    await waitFor(() => {
      expect(mockFetchRegistryEntry).toHaveBeenCalledWith("agent", "research");
    });
  });

  it("does not load any config when no type is selected", async () => {
    render(<Harness defaults={{ type: "" }} />, {
      preloadedState: agentTypesState,
    });

    // Give any effects a chance to run before asserting nothing fired.
    await Promise.resolve();
    expect(mockFetchRegistryEntry).not.toHaveBeenCalled();
  });
});
