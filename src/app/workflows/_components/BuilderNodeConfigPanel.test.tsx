import { describe, expect, it, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@/test-utils/test-utils";
import { BuilderNodeConfigPanel } from "./BuilderNodeConfigPanel";
import type { BuilderStepNodeType } from "./nodes/BuilderStepNode";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";

const writer: ToolDefinition = {
  key: "writer",
  name: "writer",
  description: "",
  version: "1",
  ui: {
    components: [],
    config: { chat_input: { id: "text", flag: "--text", required: true } },
  },
};

const inputs: WorkflowInputField[] = [
  { key: "topic", label: "Topic", input: "text" },
];

const stepNode: BuilderStepNodeType = {
  id: "s1",
  type: "builderStep",
  position: { x: 0, y: 0 },
  data: { stepType: "tool", label: "Write", toolName: "writer" },
};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof BuilderNodeConfigPanel>> = {}
) {
  render(
    <ReactFlowProvider>
      <BuilderNodeConfigPanel
        selectedNode={null}
        nodes={[stepNode]}
        edges={[]}
        ensureDependsOnEdge={vi.fn()}
        onChangeValue={vi.fn()}
        onChangeFileBinding={vi.fn()}
        inputs={inputs}
        onAddInput={vi.fn()}
        onRemoveInput={vi.fn()}
        onChangeInput={vi.fn()}
        {...overrides}
      />
    </ReactFlowProvider>,
    { preloadedState: { tools: { list: [writer] } } }
  );
}

describe("BuilderNodeConfigPanel states", () => {
  it("shows workflow input settings when no step is selected", () => {
    renderPanel();
    expect(screen.getByText("Workflow inputs (1)")).toBeInTheDocument();
  });

  it("shows the step's tool config when a step is selected", () => {
    renderPanel({ selectedNode: stepNode });
    expect(
      screen.getByRole("heading", { name: "Configuration" })
    ).toBeInTheDocument();
    expect(screen.getByText("Write")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a step or an input to configure it.")
    ).not.toBeInTheDocument();
  });

});
