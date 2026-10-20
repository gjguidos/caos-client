import { render, screen, userEvent } from "@/test-utils/test-utils";
import { declaredValue, presentedOutput } from "@/test-utils/workflow-fixtures";
import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";
import { describe, expect, it, vi } from "vitest";
import { StepPanel } from "./StepPanel";

const STEP: WorkflowStep = {
  id: "write",
  type: "tool",
  label: "Write draft",
  command: "@writer --topic=${inputs.topic} --brief=${outputs.research.answer}",
  save_as: "draft",
};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof StepPanel>> = {}
) {
  const onSelectStep = vi.fn();
  const onBack = vi.fn();
  render(
    <StepPanel
      step={STEP}
      label="Write draft"
      status="COMPLETED"
      resolution={{
        inputs: { topic: "Q3 launch" },
        stepOutputs: {
          research: presentedOutput({
            declared: { answer: declaredValue("Answer", "Sales are up") },
          }),
        },
      }}
      getStepLabel={(id) => (id === "research" ? "Research" : undefined)}
      getRunInput={() => undefined}
      onSelectStep={onSelectStep}
      onBack={onBack}
      {...overrides}
    />
  );
  return { onSelectStep, onBack };
}

describe("StepPanel — header", () => {
  it("names the step and nothing else about its definition", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { name: "Write draft" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/@writer/)).not.toBeInTheDocument();
    expect(screen.queryByText("→ draft")).not.toBeInTheDocument();
  });

  it("says nothing about status or timing for a step that has not run", () => {
    renderPanel({ status: undefined });
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it("returns to run scope from the close control", async () => {
    const user = userEvent.setup();
    const { onBack } = renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Close step details" })
    );

    expect(onBack).toHaveBeenCalled();
  });

  it("returns to run scope on Escape, wherever focus happens to be", async () => {
    const user = userEvent.setup();
    const { onBack } = renderPanel();

    await user.keyboard("{Escape}");

    expect(onBack).toHaveBeenCalled();
  });

  it("shows the status and elapsed time from the backend timings", () => {
    renderPanel({
      timing: {
        startedAt: "2026-01-01T00:00:00Z",
        completedAt: "2026-01-01T00:00:04Z",
      },
    });
    expect(screen.getByText("Completed · 4.0s")).toBeInTheDocument();
  });
});

describe("StepPanel — pause gate", () => {
  const GATE = {
    info: { pauseId: "p1", stepId: "write", prompt: "Approve the draft?" },
    isResuming: false,
    isConnected: true,
    onContinue: vi.fn(),
    onCancel: vi.fn(),
  };

  it("answers the gate from the panel, on whichever tab is open", async () => {
    const user = userEvent.setup();
    renderPanel({ status: "PAUSED", pause: GATE });

    expect(screen.getByText("Approve the draft?")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Output" }));

    expect(
      screen.getByRole("button", { name: "Continue" })
    ).toBeInTheDocument();
  });

  it("shows no gate for a step the run is not waiting on", () => {
    renderPanel();
    expect(
      screen.queryByRole("button", { name: "Continue" })
    ).not.toBeInTheDocument();
  });
});

describe("StepPanel — tabs", () => {
  it("opens on Input, showing resolved values and their sources", () => {
    renderPanel();

    expect(screen.getByText("Q3 launch")).toBeInTheDocument();
    expect(screen.getByText("Sales are up")).toBeInTheDocument();
    expect(screen.getByText("from run input Topic")).toBeInTheDocument();
  });

  it("links an output-sourced argument back to its producing step", async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Research" }));

    expect(onSelectStep).toHaveBeenCalledWith("research");
  });

  it("marks an argument whose source has not produced anything yet", () => {
    renderPanel({
      resolution: { inputs: {}, stepOutputs: {} },
    });

    // An empty run input is waiting on the reader, an empty upstream on the run.
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
  });

  // Before a run exists the page passes the run form's draft as `inputs`, so
  // the panel previews what the step would be given if it started now. The panel
  // is not told which of the two it has, and does not need to be.
  it("previews a run input from the form before the run starts", () => {
    renderPanel({
      resolution: { inputs: { topic: "Q4 launch" }, stepOutputs: {} },
    });

    expect(screen.getByText("Q4 launch")).toBeInTheDocument();
  });

  it("renders a presented tool result on the Output tab", async () => {
    const user = userEvent.setup();
    renderPanel({
      output: {
        ok: true,
        tool: "writer",
        text: "The draft body",
        images: [
          { url: "data:image/png;base64,iVBORw0", mime_type: "image/png" },
        ],
        error: null,
      },
    });

    await user.click(screen.getByRole("tab", { name: "Output" }));

    expect(screen.getByText("The draft body")).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Text" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download writer output" })
    ).toBeInTheDocument();
  });

  it("shows a step error alongside its output", async () => {
    const user = userEvent.setup();
    renderPanel({ status: "FAILED", error: "writer timed out" });

    await user.click(screen.getByRole("tab", { name: "Output" }));

    expect(screen.getByText("writer timed out")).toBeInTheDocument();
  });

  it("explains an empty output in terms of the step's status", async () => {
    const user = userEvent.setup();
    renderPanel({ status: "PENDING" });

    await user.click(screen.getByRole("tab", { name: "Output" }));

    expect(screen.getByText("Waiting on earlier steps.")).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: "Input" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Output" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
