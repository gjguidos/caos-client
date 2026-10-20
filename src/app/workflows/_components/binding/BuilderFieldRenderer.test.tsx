import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolOutput } from "@/store/slices/registry/toolsSlice";
import {
  createBuilderRenderField,
  type BindingContext,
} from "./BuilderFieldRenderer";
import type { OutputSource } from "./types";

const component: UIComponent = {
  id: "prompt",
  type: "text",
  props: { label: "Prompt" },
} as unknown as UIComponent;

const requiredComponent: UIComponent = {
  ...component,
  flag_config: { flag: "--prompt", required: true },
} as unknown as UIComponent;

const input = (key: string, label = key): WorkflowInputField => ({
  key,
  label,
  input: "text",
});

const fileInput = (key: string, label = key): WorkflowInputField => ({
  key,
  label,
  input: "file",
});

const output = (
  key: string,
  label: string,
  type: ToolOutput["type"] = "string"
): ToolOutput => ({ key, label, type, path: `result.${key}` });

const source = (
  stepId: string,
  label: string,
  outputs: ToolOutput[] = [output("answer", "Answer")]
): OutputSource => ({ stepId, label, outputs });

function renderField(
  args: {
    value?: string | number | string[] | undefined;
    context?: Partial<BindingContext>;
    component?: UIComponent;
  } = {}
) {
  const onChange = vi.fn();
  const onBindOutput = vi.fn();
  const context: BindingContext = {
    inputs: args.context?.inputs ?? [],
    outputSources: args.context?.outputSources ?? [],
    onBindOutput: args.context?.onBindOutput ?? onBindOutput,
  };
  const render$ = createBuilderRenderField(context);
  render(
    <>
      {render$({
        component: args.component ?? component,
        value: args.value,
        onChange,
        defaultField: <div data-testid="default-field">literal widget</div>,
      })}
    </>
  );
  return { onChange, onBindOutput };
}

describe("BuilderField segmented toggle", () => {
  it("hides the toggle when there is nothing to link to", () => {
    renderField({ value: "" });
    expect(screen.queryByText("⤵ Link")).not.toBeInTheDocument();
    expect(screen.getByTestId("default-field")).toBeInTheDocument();
  });

  it("marks an empty required field even with nothing to link to", () => {
    renderField({ value: "", component: requiredComponent });
    expect(screen.getByText(/Required/)).toBeInTheDocument();
    // Still just the literal widget — no toggle without sources.
    expect(screen.getByTestId("default-field")).toBeInTheDocument();
    expect(screen.queryByText("⤵ Link")).not.toBeInTheDocument();
  });

  it("drops the marker once the required field has a value", () => {
    renderField({ value: "hello", component: requiredComponent });
    expect(screen.queryByText(/Required/)).not.toBeInTheDocument();
  });

  it("drops the marker when the required field is bound", () => {
    renderField({
      value: "${inputs.topic}",
      component: requiredComponent,
      context: { inputs: [input("topic", "Topic")] },
    });
    expect(screen.queryByText(/Required/)).not.toBeInTheDocument();
  });

  it("does not mark an optional field", () => {
    renderField({ value: "", context: { inputs: [input("topic")] } });
    expect(screen.queryByText(/Required/)).not.toBeInTheDocument();
  });

  it("shows the toggle when inputs exist", () => {
    renderField({ value: "", context: { inputs: [input("topic")] } });
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("⤵ Link")).toBeInTheDocument();
    expect(screen.getByTestId("default-field")).toBeInTheDocument();
  });

  it("hides the toggle when only file-kind inputs exist", () => {
    // A file input can't feed a command arg, so there is nothing to link to.
    renderField({ value: "", context: { inputs: [fileInput("pic")] } });
    expect(screen.queryByText("⤵ Link")).not.toBeInTheDocument();
    expect(screen.getByTestId("default-field")).toBeInTheDocument();
  });

  it("excludes file-kind inputs from the command-arg picker", async () => {
    const user = userEvent.setup();
    renderField({
      value: "",
      context: { inputs: [input("topic", "Topic"), fileInput("pic", "Pic")] },
    });
    await user.click(screen.getByText("⤵ Link"));
    const select = screen.getByRole("combobox");
    expect(
      within(select).getByRole("option", { name: "inputs · Topic" })
    ).toBeInTheDocument();
    expect(
      within(select).queryByRole("option", { name: /Pic/ })
    ).not.toBeInTheDocument();
  });

  it("switching to Link shows the grouped select", async () => {
    const user = userEvent.setup();
    renderField({
      value: "",
      context: {
        inputs: [input("topic", "Topic")],
        outputSources: [source("s1", "Search")],
      },
    });
    await user.click(screen.getByText("⤵ Link"));

    const select = screen.getByRole("combobox");
    expect(
      within(select).getByRole("group", { name: "Workflow inputs" })
    ).toBeInTheDocument();
    expect(
      within(select).getByRole("group", { name: "Steps" })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("default-field")).not.toBeInTheDocument();
  });

  it("picking an input writes ${inputs.<key>}", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      value: "",
      context: { inputs: [input("topic", "Topic")] },
    });
    await user.click(screen.getByText("⤵ Link"));
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "inputs · Topic" })
    );
    expect(onChange).toHaveBeenCalledWith("prompt", "${inputs.topic}");
  });

  it("picking a step output writes ${outputs.<id>.<key>} and binds the edge", async () => {
    const user = userEvent.setup();
    const onBindOutput = vi.fn();
    const { onChange } = renderField({
      value: "",
      context: {
        outputSources: [source("s1", "Search")],
        onBindOutput,
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: /Search · Answer \(string\)/ })
    );
    expect(onBindOutput).toHaveBeenCalledWith("s1");
    expect(onChange).toHaveBeenCalledWith("prompt", "${outputs.s1.answer}");
  });

  it("renders one option per declared output", async () => {
    const user = userEvent.setup();
    renderField({
      value: "",
      context: {
        outputSources: [
          source("s1", "Search", [
            output("answer", "Answer"),
            output("count", "Count", "number"),
          ]),
        ],
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    const steps = within(screen.getByRole("combobox")).getByRole("group", {
      name: "Steps",
    });
    expect(
      within(steps).getByRole("option", { name: /Search · Answer \(string\)/ })
    ).toBeInTheDocument();
    expect(
      within(steps).getByRole("option", { name: /Search · Count \(number\)/ })
    ).toBeInTheDocument();
  });

  it("excludes image outputs from the command-arg picker", async () => {
    const user = userEvent.setup();
    renderField({
      value: "",
      context: {
        outputSources: [
          source("s1", "Draw", [
            output("answer", "Answer"),
            output("image", "Image", "image"),
          ]),
        ],
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    const steps = within(screen.getByRole("combobox")).getByRole("group", {
      name: "Steps",
    });
    expect(
      within(steps).getByRole("option", { name: /Draw · Answer \(string\)/ })
    ).toBeInTheDocument();
    expect(
      within(steps).queryByRole("option", { name: /Image/ })
    ).not.toBeInTheDocument();
  });

  it("hides the toggle when a step's only outputs are images", () => {
    // Image outputs feed file slots, not command args, so there is nothing to
    // link even though an upstream step exists — don't offer a toggle that would
    // open onto the empty-hint.
    renderField({
      value: "",
      context: {
        outputSources: [
          source("s1", "Draw", [output("image", "Image", "image")]),
        ],
      },
    });
    expect(screen.queryByText("⤵ Link")).not.toBeInTheDocument();
    expect(screen.getByTestId("default-field")).toBeInTheDocument();
  });

  it("offers nothing for a step whose tool declares no outputs", async () => {
    const user = userEvent.setup();
    renderField({
      value: "",
      context: {
        inputs: [input("topic", "Topic")],
        outputSources: [source("s1", "Search", [])],
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    expect(
      within(screen.getByRole("combobox")).queryByRole("group", {
        name: "Steps",
      })
    ).not.toBeInTheDocument();
  });

  it("badges a type-incompatible output but still binds it", async () => {
    const user = userEvent.setup();
    const numberField = {
      ...component,
      type: "number",
    } as unknown as UIComponent;
    const { onChange } = renderField({
      value: "",
      component: numberField,
      context: {
        outputSources: [source("s1", "Search", [output("answer", "Answer")])],
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    expect(
      within(screen.getByRole("combobox")).getByRole("option", {
        name: /Search · Answer \(string\) ⚠/,
      })
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: /Search · Answer \(string\) ⚠/ })
    );
    expect(onChange).toHaveBeenCalledWith("prompt", "${outputs.s1.answer}");
  });

  it("badges an object output against a text field but still binds it", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      value: "",
      context: {
        outputSources: [
          source("s1", "Search", [output("data", "Data", "object")]),
        ],
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    const option = within(screen.getByRole("combobox")).getByRole("option", {
      name: /Search · Data \(object\) ⚠/,
    });
    expect(option).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), option);
    expect(onChange).toHaveBeenCalledWith("prompt", "${outputs.s1.data}");
  });

  it("binds an object output into a JsonField target without a badge", async () => {
    const user = userEvent.setup();
    const jsonField = {
      ...component,
      type: "object",
    } as unknown as UIComponent;
    const { onChange } = renderField({
      value: "",
      component: jsonField,
      context: {
        outputSources: [
          source("s1", "Search", [output("data", "Data", "object")]),
        ],
      },
    });
    await user.click(screen.getByText("⤵ Link"));
    const option = within(screen.getByRole("combobox")).getByRole("option", {
      name: /Search · Data \(object\)/,
    });
    expect(option.textContent).not.toContain("⚠");
    await user.selectOptions(screen.getByRole("combobox"), option);
    expect(onChange).toHaveBeenCalledWith("prompt", "${outputs.s1.data}");
  });

  it("renders the bound pill with the source label and unlinks to ''", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      value: "${inputs.topic}",
      context: { inputs: [input("topic", "Topic")] },
    });
    expect(screen.getByText(/inputs · Topic/)).toBeInTheDocument();
    // Stays in link mode (no literal widget) while bound.
    expect(screen.queryByTestId("default-field")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlink Prompt" }));
    expect(onChange).toHaveBeenCalledWith("prompt", "");
  });

  it("toggling back to Value clears the binding", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      value: "${inputs.topic}",
      context: { inputs: [input("topic", "Topic")] },
    });
    await user.click(screen.getByText("Value"));
    expect(onChange).toHaveBeenCalledWith("prompt", "");
  });

  it("shows the step · output label for a bound step-output pill", () => {
    renderField({
      value: "${outputs.s1.answer}",
      context: {
        outputSources: [source("s1", "Search", [output("answer", "Answer")])],
      },
    });
    expect(screen.getByText(/↳ Search · Answer/)).toBeInTheDocument();
  });
});
