import { describe, expect, it, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { render, screen, userEvent } from "@/test-utils/test-utils";
import { WorkflowInputPanel } from "./WorkflowInputPanel";
import type { BuilderStepNodeType } from "./nodes/BuilderStepNode";
import type { InputUsage } from "../_lib/inputUsage";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";

const tone: UIComponent = {
  id: "tone",
  type: "text",
  widget: "TextField",
  group: "propertiesPanel.style",
  flag_config: { flag: "--tone_of_voice", required: false },
  render_paths: ["propertiesPanel.style"],
  slot_order: 5,
  props: { label: "Tone" },
};

const writer: ToolDefinition = {
  key: "writer",
  name: "writer",
  description: "",
  version: "1",
  ui: {
    components: [tone],
    config: { chat_input: { id: "text", flag: "--text", required: true } },
  },
  supports: {
    files: {
      max_count: 1,
      max_size_bytes: 1,
      accepted_mimes: null,
      slots: [{ name: "doc_file", label: "Document" }],
    },
  },
};

const textInput: WorkflowInputField = {
  key: "topic",
  label: "Topic",
  input: "text",
};
const fileInput: WorkflowInputField = {
  key: "doc",
  label: "Doc",
  input: "file",
};

function stepNode(
  id: string,
  data: Partial<BuilderStepNodeType["data"]> = {}
): BuilderStepNodeType {
  return {
    id,
    type: "builderStep",
    position: { x: 0, y: 0 },
    data: { stepType: "tool", label: id, toolName: "writer", ...data },
  };
}

function argUsage(overrides: Partial<InputUsage> = {}): InputUsage {
  return {
    inputKey: "topic",
    stepId: "s1",
    stepLabel: "Write",
    target: { kind: "arg", componentId: "text" },
    fieldLabel: "text",
    whole: true,
    ...overrides,
  };
}

function renderPanel(props: Partial<Parameters<typeof WorkflowInputPanel>[0]>) {
  const handlers = {
    onChangeInput: vi.fn(),
    onRemoveInput: vi.fn(),
    onChangeValue: vi.fn(),
    onChangeFileBinding: vi.fn(),
    onSelectStep: vi.fn(),
    onFocusChange: vi.fn(),
  };
  const view = render(
    <ReactFlowProvider>
      <WorkflowInputPanel
        index={0}
        field={textInput}
        usages={[]}
        nodes={[stepNode("s1")]}
        tools={[writer]}
        {...handlers}
        {...props}
      />
    </ReactFlowProvider>
  );
  return { ...handlers, ...view };
}

describe("WorkflowInputPanel", () => {
  it("renders the definition fields, the Used-by list and the picker", () => {
    renderPanel({ usages: [argUsage()] });
    expect(screen.getByLabelText("Input Identifier")).toHaveValue("topic");
    expect(
      screen.getByRole("heading", { name: "Used by (1)" })
    ).toBeInTheDocument();
    expect(screen.getByText("Write · text")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Bind this input to a step field")
    ).toBeInTheDocument();
  });

  it("says so when the input is unused", () => {
    renderPanel({});
    expect(screen.getByText("Not used by any step yet.")).toBeInTheDocument();
  });

  it("selects the named step when a Used-by row is clicked", async () => {
    const { onSelectStep } = renderPanel({ usages: [argUsage()] });
    await userEvent.click(screen.getByRole("button", { name: "Write · text" }));
    expect(onSelectStep).toHaveBeenCalledWith("s1");
  });

  it("unbinds a whole binding by clearing the field's value", async () => {
    const { onChangeValue } = renderPanel({ usages: [argUsage()] });
    await userEvent.click(screen.getByLabelText("Unbind Write · text"));
    expect(onChangeValue).toHaveBeenCalledWith("s1", "text", undefined);
  });

  it("unbinds a file slot through the file-binding write-back", async () => {
    const { onChangeFileBinding } = renderPanel({
      field: fileInput,
      usages: [
        argUsage({
          inputKey: "doc",
          target: { kind: "slot", slotName: "doc_file" },
          fieldLabel: "Document",
        }),
      ],
    });
    await userEvent.click(screen.getByLabelText("Unbind Write · Document"));
    expect(onChangeFileBinding).toHaveBeenCalledWith(
      "s1",
      "doc_file",
      undefined
    );
  });

  it("offers no unlink for a token embedded in a larger string", () => {
    renderPanel({ usages: [argUsage({ whole: false })] });
    expect(screen.getByText("in text")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Unbind/)).not.toBeInTheDocument();
  });

  it("lights exactly one usage edge while a row is hovered", async () => {
    const { onFocusChange } = renderPanel({ usages: [argUsage()] });
    await userEvent.hover(screen.getByText("Write · text"));
    expect(onFocusChange).toHaveBeenCalledWith({
      kind: "edge",
      id: "inputedge:0:s1",
    });
  });

  it("offers command args, never slots, for a non-file input", () => {
    renderPanel({});
    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent?.trim());
    expect(options).toContain("Tone");
    expect(options).toContain("text");
    expect(options).not.toContain("Document");
  });

  it("offers file slots, never args, for a file input", () => {
    renderPanel({ field: fileInput });
    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent?.trim());
    expect(options).toContain("Document");
    expect(options).not.toContain("Tone");
    expect(options).not.toContain("text");
  });

  it("excludes fields already bound to this input", () => {
    renderPanel({ usages: [argUsage()] });
    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent?.trim());
    expect(options).not.toContain("text");
    expect(options).toContain("Tone");
  });

  it("marks a field that already holds a value as set", () => {
    renderPanel({
      nodes: [stepNode("s1", { command: '@writer --text="hi"' })],
    });
    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent?.trim());
    expect(options).toContain("text · set");
  });

  it("writes ${inputs.<key>} when a field is picked, touching no edges", async () => {
    const { onChangeValue } = renderPanel({});
    await userEvent.selectOptions(
      screen.getByLabelText("Bind this input to a step field"),
      screen.getByRole("option", { name: "Tone" })
    );
    // The picker's only write-back is the field value: an input binding is not
    // an execution dependency, so no `depends_on` edge is ensured.
    expect(onChangeValue).toHaveBeenCalledWith("s1", "tone", "${inputs.topic}");
  });

  it("refuses to bind an input with a blank identifier", () => {
    renderPanel({ field: { ...textInput, key: "  " } });
    expect(
      screen.queryByLabelText("Bind this input to a step field")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Give this input an identifier/)
    ).toBeInTheDocument();
  });

  it("keeps same-labeled steps in separate picker groups", () => {
    const { container } = renderPanel({
      nodes: [
        stepNode("s1", { label: "Write" }),
        stepNode("s2", { label: "Write" }),
      ],
    });
    expect(container.querySelectorAll("optgroup").length).toBe(2);
  });

  it("removes the input by declaration index", async () => {
    const { onRemoveInput } = renderPanel({ index: 2 });
    await userEvent.click(screen.getByLabelText("Remove input"));
    expect(onRemoveInput).toHaveBeenCalledWith(2);
  });
});
