import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolOutput } from "@/store/slices/registry/toolsSlice";
import {
  BoundReferenceControl,
  type BoundReferenceControlProps,
} from "./BoundReferenceControl";
import type { OutputSource } from "./types";

const output = (
  key: string,
  label: string,
  type: ToolOutput["type"]
): ToolOutput => ({ key, label, type, path: `result.${key}` });

const imageSource = (stepId: string, label: string): OutputSource => ({
  stepId,
  label,
  outputs: [output("image", "Image", "image")],
});

const fileInput = (
  key: string,
  label: string,
  acceptedMimes?: string[]
): WorkflowInputField => ({
  key,
  label,
  input: "file",
  constraints: acceptedMimes ? { accepted_mimes: acceptedMimes } : undefined,
});

/**
 * Exercises the control as the file-slot surface wires it (`FileBindings` in
 * `BuilderNodeConfigPanel`): no workflow inputs, image-only sources, advisory
 * `required`, custom empty hint. The command-arg wiring is covered by
 * `BuilderFieldRenderer.test.tsx`.
 */
function renderControl(patch: Partial<BoundReferenceControlProps> = {}) {
  const onChange = vi.fn();
  const onBindOutput = vi.fn();
  render(
    <BoundReferenceControl
      label="Source image"
      value={undefined}
      inputs={[]}
      outputSources={[]}
      expectedType="image"
      emptyHint="No upstream image outputs yet — connect a step that produces an image before this one."
      onChange={onChange}
      onBindOutput={onBindOutput}
      {...patch}
    />
  );
  return { onChange, onBindOutput };
}

describe("BoundReferenceControl as a file-slot binding row", () => {
  it("shows the custom empty hint when there are no eligible sources", () => {
    renderControl();
    expect(
      screen.getByText(/No upstream image outputs yet/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("picking an image output writes ${outputs.<id>.<key>} and binds the edge", async () => {
    const user = userEvent.setup();
    const { onChange, onBindOutput } = renderControl({
      outputSources: [imageSource("src1", "Source")],
    });
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: /Source · Image \(image\)/ })
    );
    expect(onBindOutput).toHaveBeenCalledWith("src1");
    expect(onChange).toHaveBeenCalledWith("${outputs.src1.image}");
  });

  it("does not badge an image output against an image expectation", async () => {
    const user = userEvent.setup();
    renderControl({ outputSources: [imageSource("src1", "Source")] });
    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getByRole("option", { name: /Source · Image/ }).textContent
    ).not.toContain("⚠");
  });

  it("renders a bound pill and unlinks to '' via a field-specific label", async () => {
    const user = userEvent.setup();
    const { onChange } = renderControl({
      value: "${outputs.src1.image}",
      outputSources: [imageSource("src1", "Source")],
    });
    expect(screen.getByText(/↳ Source · Image/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Unlink Source image" })
    );
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("offers a file-kind workflow input and picking it writes ${inputs.<key>}", async () => {
    const user = userEvent.setup();
    const { onChange, onBindOutput } = renderControl({
      inputs: [fileInput("source_image", "Source image upload")],
    });
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: /inputs · Source image upload/ })
    );
    expect(onChange).toHaveBeenCalledWith("${inputs.source_image}");
    // An input binding has no producer step, so no edge to ensure.
    expect(onBindOutput).not.toHaveBeenCalled();
  });

  it("does not badge an input whose mimes intersect the slot's", async () => {
    const user = userEvent.setup();
    renderControl({
      inputs: [fileInput("pic", "Picture", ["image/png"])],
      slotAcceptedMimes: ["image/*"],
    });
    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getByRole("option", { name: /inputs · Picture/ }).textContent
    ).not.toContain("⚠");
  });

  it("badges an input whose mimes cannot intersect the slot's", async () => {
    const user = userEvent.setup();
    renderControl({
      inputs: [fileInput("doc", "Document", ["application/pdf"])],
      slotAcceptedMimes: ["image/png", "image/jpeg"],
    });
    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getByRole("option", { name: /inputs · Document ⚠/ })
    ).toBeInTheDocument();
  });

  it("renders the inputs pill label for a bound ${inputs.<key>}", () => {
    renderControl({
      value: "${inputs.source_image}",
      inputs: [fileInput("source_image", "Source image upload")],
    });
    expect(
      screen.getByText(/↳ inputs · Source image upload/)
    ).toBeInTheDocument();
  });

  it("marks a required, unbound slot", () => {
    renderControl({ required: true });
    expect(screen.getByText(/Required/)).toBeInTheDocument();
  });

  it("drops the required marker once the slot is bound", () => {
    renderControl({
      required: true,
      value: "${outputs.src1.image}",
      outputSources: [imageSource("src1", "Source")],
    });
    expect(screen.queryByText(/Required/)).not.toBeInTheDocument();
  });
});
