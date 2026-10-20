import type {
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { render, screen, userEvent } from "@/test-utils/test-utils";
import type { UploadedFile } from "@/store/slices/uploadedFiles/uploadedFilesSlice";
import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { RunTab } from "../_hooks/useRunPanelTab";
import { extractWorkflowInputs } from "../_lib/parseWorkflowDefinition";
import { createRunInputLookup } from "../_lib/runInputDisplay";
import { RunPanel } from "./RunPanel";

const STEPS: WorkflowStep[] = [
  { id: "research", type: "tool", label: "Research" },
  { id: "write", type: "tool", label: "Write draft" },
];

// Built through the real converter so the fixture can't drift from the shape
// the Run form is actually handed at runtime.
const INPUTS: UIComponent[] = extractWorkflowInputs({
  key: "brief_writer",
  inputs: [
    { key: "topic", label: "Topic", input: "text", required: true },
    { key: "photo", label: "Photo", input: "file" },
  ],
});

/**
 * The tab and the form values are both owned by the page (`useRunPanelTab`,
 * `useRunInputs`), so the harness holds them here and lets the panel move them —
 * otherwise every assertion would need the caller to also pass the state it
 * expects to land on.
 */
function ControlledRunPanel(
  props: Omit<
    React.ComponentProps<typeof RunPanel>,
    "activeTab" | "onTabChange" | "values" | "onValueChange"
  >
) {
  const [tab, setTab] = useState<RunTab>("inputs");
  const [values, setValues] = useState<FormValues>({});
  return (
    <RunPanel
      {...props}
      activeTab={tab}
      onTabChange={setTab}
      values={values}
      onValueChange={(key, value) =>
        setValues((prev) => ({ ...prev, [key]: value }))
      }
    />
  );
}

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof ControlledRunPanel>> = {},
  uploadedFiles: UploadedFile[] = []
) {
  const onRun = vi.fn();
  const onSelectStep = vi.fn();
  render(
    <ControlledRunPanel
      inputs={INPUTS}
      getRunInput={createRunInputLookup(INPUTS)}
      steps={STEPS}
      stepOutputs={{}}
      stepErrors={{}}
      outputOrder={[]}
      events={[]}
      runInputs={null}
      runStatus={null}
      isStarting={false}
      isConnected
      onRun={onRun}
      getStepLabel={(id) => STEPS.find((step) => step.id === id)?.label}
      onSelectStep={onSelectStep}
      {...overrides}
    />,
    {
      preloadedState: {
        uploadedFiles: {
          byId: Object.fromEntries(
            uploadedFiles.map((file) => [file.fileId, file])
          ),
        },
      },
    }
  );
  return { onRun, onSelectStep };
}

describe("RunPanel — before a run", () => {
  it("shows the inputs form", () => {
    renderPanel();
    expect(screen.getByRole("tab", { name: "Inputs" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("button", { name: "Run workflow" })).toBeDisabled();
  });

  it("runs with the entered values once required inputs are filled", async () => {
    const user = userEvent.setup();
    const { onRun } = renderPanel();

    await user.type(screen.getByLabelText(/Topic/), "Q3 launch");
    await user.click(screen.getByRole("button", { name: "Run workflow" }));

    expect(onRun).toHaveBeenCalledWith({ topic: "Q3 launch" });
  });

  it("will not run a value the form is flagging as out of range", async () => {
    const user = userEvent.setup();
    const inputs = extractWorkflowInputs({
      key: "brief_writer",
      inputs: [
        {
          key: "threshold",
          label: "Threshold",
          input: "number",
          constraints: { min: 0, max: 1 },
        },
      ],
    });
    renderPanel({ inputs });

    await user.type(screen.getByLabelText(/Threshold/), "1.5");

    expect(
      screen.getByText("Enter a value between 0 and 1")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run workflow" })).toBeDisabled();
  });

  it("explains why running is unavailable while disconnected", () => {
    renderPanel({ isConnected: false });
    expect(screen.getByText("Connecting to the agent…")).toBeInTheDocument();
  });
});

describe("RunPanel — during and after a run", () => {
  it("keeps the submitted inputs readable instead of replacing them", () => {
    renderPanel({
      runStatus: "RUNNING",
      runInputs: { topic: "Q3 launch" },
    });

    // Read back under the label its form field carries, not under its key.
    expect(screen.getByText("Topic")).toBeInTheDocument();
    expect(screen.getByText("Q3 launch")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Run workflow" })
    ).not.toBeInTheDocument();
  });

  it("shows a submitted file as the file rather than as its id", () => {
    const fileId = "f_0af6137ad4df41dea02eb3cb2d994210";
    renderPanel({ runStatus: "RUNNING", runInputs: { photo: fileId } }, [
      {
        fileId,
        name: "bathroom.png",
        mime: "image/png",
        size: 2048,
        previewUrl: "blob:mock/1",
      },
    ]);

    expect(
      screen.getByRole("img", { name: "bathroom.png" })
    ).toBeInTheDocument();
    expect(screen.queryByText(fileId)).not.toBeInTheDocument();
  });

  it("says so when a run took no inputs", () => {
    renderPanel({ runStatus: "COMPLETED", runInputs: {} });
    expect(
      screen.getByText("This run was started without inputs.")
    ).toBeInTheDocument();
  });

  it("counts and lists only the steps that produced something", async () => {
    const user = userEvent.setup();
    renderPanel({
      runStatus: "COMPLETED",
      stepOutputs: { research: "Sales are up" },
      outputOrder: ["research"],
    });

    const tab = screen.getByRole("tab", { name: /Outputs/ });
    expect(tab).toHaveTextContent("1");

    await user.click(tab);
    expect(screen.getByTestId("output-entry-research")).toBeInTheDocument();
    expect(screen.queryByTestId("output-entry-write")).not.toBeInTheDocument();
  });

  it("offers a way to take each output off the page", async () => {
    const user = userEvent.setup();
    renderPanel({
      runStatus: "COMPLETED",
      stepOutputs: { research: "Sales are up" },
      outputOrder: ["research"],
    });

    await user.click(screen.getByRole("tab", { name: /Outputs/ }));

    expect(
      screen.getByRole("button", { name: "Copy Research" })
    ).toBeInTheDocument();
  });

  it("lists a failed step's error even with no output", async () => {
    const user = userEvent.setup();
    renderPanel({
      runStatus: "FAILED",
      stepErrors: { research: "search timed out" },
      outputOrder: ["research"],
    });

    await user.click(screen.getByRole("tab", { name: /Outputs/ }));

    expect(screen.getByText("search timed out")).toBeInTheDocument();
  });

  it("streams the run's chronology on the Events tab", async () => {
    const user = userEvent.setup();
    renderPanel({
      runStatus: "RUNNING",
      events: [
        {
          id: "0",
          ts: Date.now(),
          kind: "step",
          stepId: "research",
          status: "RUNNING",
        },
      ],
    });

    const tab = screen.getByRole("tab", { name: /Events/ });
    expect(tab).toHaveTextContent("1");

    await user.click(tab);
    expect(screen.getByTestId("event-row-0")).toHaveTextContent("Research");
  });

  it("invites the run to finish when nothing has been produced", async () => {
    const user = userEvent.setup();
    renderPanel({ runStatus: "RUNNING" });

    await user.click(screen.getByRole("tab", { name: /Outputs/ }));

    expect(
      screen.getByText(
        "No outputs yet. Completed steps show their results here."
      )
    ).toBeInTheDocument();
  });
});
