import { agentFormDefaults } from "@/app/agents/_components/CreateAgentForm/agentForm";
import { Form } from "@/app/agents/_components/Form/Form";
import { AgentFormValues } from "@/shared/lib/agent.types";
import { render, screen } from "@/test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { getDraftGaps } from "../draftStatus";
import { MenuSection } from "./wizardSteps";
import SummaryPanel from "./SummaryPanel";

vi.mock("@/shared/hooks/useWorkflowCatalog", () => ({
  useWorkflowCatalog: () => ({ status: "ready", entries: [] }),
}));

const cognitiveModules = {
  llm: { default: "azure-gpt-4o", options: ["azure-gpt-4o", "azure-gpt-5"] },
};

const registryState = {
  agentTypes: { list: [{ key: "chat", name: "Chat", description: "" }] },
  roles: { list: [{ key: "researcher", name: "Researcher", description: "" }] },
};

function Harness({
  defaults,
  onGoToGap,
}: {
  defaults?: Partial<AgentFormValues>;
  onGoToGap?: (gap: ReturnType<typeof getDraftGaps>[number]) => void;
}) {
  const form = useForm<AgentFormValues>({
    defaultValues: { ...agentFormDefaults, ...defaults },
  });
  const gaps = getDraftGaps(form.getValues(), { cognitiveModules });

  return (
    <Form {...form}>
      <SummaryPanel
        form={form}
        onSubmit={vi.fn()}
        cognitiveModules={cognitiveModules}
        gaps={gaps}
        onGoToGap={onGoToGap}
        soul={null}
      />
    </Form>
  );
}

const complete: Partial<AgentFormValues> = {
  name: "Nova Research",
  type: "chat",
  roleRegistry: "researcher",
  security: { visibility: "public", whitelisted_groups: [] },
  cognitive_modules: {
    ...agentFormDefaults.cognitive_modules,
    llm: "azure-gpt-4o",
  } as AgentFormValues["cognitive_modules"],
};

describe("SummaryPanel", () => {
  it("lists one entry per gap and blocks submit while any remain", () => {
    render(<Harness />, { preloadedState: registryState });

    expect(screen.getByText("BEFORE YOU CREATE")).toBeInTheDocument();
    expect(screen.getByText("Give the agent a name")).toBeInTheDocument();
    expect(screen.getByText("Pick an agent role")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Create agent" })).toBeDisabled();
  });

  it("takes the reader to the step that owns a gap", async () => {
    const onGoToGap = vi.fn();
    render(<Harness onGoToGap={onGoToGap} />, {
      preloadedState: registryState,
    });

    await userEvent.click(screen.getByText("Pick an agent role"));

    expect(onGoToGap).toHaveBeenCalledWith(
      expect.objectContaining({
        field: "roleRegistry",
        step: MenuSection.Identity,
      })
    );
  });

  it("enables submit and drops the gap list once the draft is complete", () => {
    render(<Harness defaults={complete} />, { preloadedState: registryState });

    expect(screen.queryByText("BEFORE YOU CREATE")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create agent" })
    ).not.toBeDisabled();
  });

  it("shows every cognitive module and its value", () => {
    render(<Harness defaults={complete} />, { preloadedState: registryState });
    expect(screen.getByText("Llm")).toBeInTheDocument();
    expect(screen.getByText("azure-gpt-4o")).toBeInTheDocument();
  });

  it("shows a module the reader changed away from the default", () => {
    render(
      <Harness
        defaults={{
          ...complete,
          cognitive_modules: {
            ...complete.cognitive_modules,
            llm: "azure-gpt-5",
          } as AgentFormValues["cognitive_modules"],
        }}
      />,
      { preloadedState: registryState }
    );

    expect(screen.getByText("azure-gpt-5")).toBeInTheDocument();
  });
});
