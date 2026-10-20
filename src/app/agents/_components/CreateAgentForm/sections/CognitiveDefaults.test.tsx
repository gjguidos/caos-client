import { agentFormDefaults } from "@/app/agents/_components/CreateAgentForm/agentForm";
import { Form } from "@/app/agents/_components/Form/Form";
import { AgentFormValues } from "@/shared/lib/agent.types";
import { render, screen } from "@/test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ActiveGapProvider } from "../activeGap";
import type { Gap } from "../draftStatus";
import { MenuSection } from "./wizardSteps";
import CognitiveDefaults from "./CognitiveDefaults";

const cognitiveModules = {
  llm: { default: "azure-gpt-4o", options: ["azure-gpt-4o", "azure-gpt-5"] },
};

const llmGap: Gap = {
  step: MenuSection.Identity,
  field: "cognitive_modules.llm",
  label: "Llm",
  message: "Choose a llm module",
};

const nameGap: Gap = {
  step: MenuSection.Identity,
  field: "name",
  label: "Name",
  message: "Give the agent a name",
};

function Harness({ gap = null }: { gap?: Gap | null }) {
  const form = useForm<AgentFormValues>({
    defaultValues: {
      ...agentFormDefaults,
      cognitive_modules: {
        ...agentFormDefaults.cognitive_modules,
        llm: "",
      },
    } as AgentFormValues,
  });

  return (
    <ActiveGapProvider gap={gap}>
      <Form {...form}>
        <CognitiveDefaults
          form={form}
          cognitiveModules={cognitiveModules}
          typeLabel="Chat"
        />
      </Form>
    </ActiveGapProvider>
  );
}

describe("CognitiveDefaults", () => {
  it("stays collapsed when no gap points at a module", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: /adjust/i })).toBeInTheDocument();
    expect(screen.queryByText("Llm")).not.toBeInTheDocument();
  });

  it("opens when the reader is sent to a module, without remounting", async () => {
    const { rerender } = render(<Harness />);
    expect(screen.queryByText("Llm")).not.toBeInTheDocument();

    // The gap arrives while the panel is already on screen - the case that
    // matters, since module gaps belong to the step the reader starts on.
    rerender(<Harness gap={llmGap} />);

    expect(screen.getByText("Llm")).toBeInTheDocument();
    expect(screen.getByText("Choose a llm module")).toBeInTheDocument();
  });

  it("ignores a gap that belongs to another field", () => {
    render(<Harness gap={nameGap} />);

    expect(screen.queryByText("Llm")).not.toBeInTheDocument();
  });

  it("closes again on request, and reopens for the next module gap", async () => {
    const { rerender } = render(<Harness gap={llmGap} />);
    expect(screen.getByText("Llm")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(screen.queryByText("Llm")).not.toBeInTheDocument();

    // Following the gap again beats the manual close: the override belongs to
    // that one visit, not to the panel forever. A visit is a distinct gap
    // object, which is what `goToGap` hands out - see useDraftStatus.test.
    rerender(<Harness gap={{ ...llmGap }} />);
    expect(screen.getByText("Llm")).toBeInTheDocument();
  });
});
