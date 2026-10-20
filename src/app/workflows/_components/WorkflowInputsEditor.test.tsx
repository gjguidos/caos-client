import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { WorkflowInputsEditor } from "./WorkflowInputsEditor";

const selectField: WorkflowInputField = {
  key: "tier",
  label: "Tier",
  input: "select",
};

/**
 * Renders the editor with a controlled parent that mirrors the real
 * `updateInput`/`removeInput` reducers, so edits round-trip back through the
 * `inputs` prop exactly as they do in the builder.
 */
function renderEditor(initial: WorkflowInputField[]) {
  const onChange = vi.fn();

  function Harness() {
    const [inputs, setInputs] = useState(initial);
    return (
      <WorkflowInputsEditor
        inputs={inputs}
        onAdd={vi.fn()}
        onRemove={(index) =>
          setInputs((prev) => prev.filter((_, i) => i !== index))
        }
        onChange={(index, patch) => {
          onChange(index, patch);
          setInputs((prev) =>
            prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
          );
        }}
      />
    );
  }

  render(<Harness />);
  return { onChange };
}

describe("WorkflowInputsEditor options", () => {
  it("lets you type a comma and parses each segment into an option", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor([selectField]);
    const field = screen.getByLabelText("Options (comma-separated)");

    await user.type(field, "gold, silver");

    // The separator survives in the field instead of snapping back.
    expect(field).toHaveValue("gold, silver");
    expect(onChange).toHaveBeenLastCalledWith(0, {
      options: [{ value: "gold" }, { value: "silver" }],
    });
  });

  it("shows the options editor for a multiselect input too", () => {
    renderEditor([{ key: "tags", label: "Tags", input: "multiselect" }]);
    expect(
      screen.getByLabelText("Options (comma-separated)")
    ).toBeInTheDocument();
  });

  it("does not show the options editor for a text input", () => {
    renderEditor([{ key: "name", label: "Name", input: "text" }]);
    expect(
      screen.queryByLabelText("Options (comma-separated)")
    ).not.toBeInTheDocument();
  });

  it("hides the Default field and shows the mimes editor for a file input", () => {
    renderEditor([{ key: "pic", label: "Picture", input: "file" }]);
    expect(
      screen.queryByLabelText("Input default value (Optional)")
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Accepted MIME types/)).toBeInTheDocument();
    expect(screen.getByLabelText("Required")).toBeInTheDocument();
  });

  it("round-trips accepted mimes through constraints.accepted_mimes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor([
      { key: "pic", label: "Picture", input: "file" },
    ]);
    const field = screen.getByLabelText(/Accepted MIME types/);

    await user.type(field, "image/png, image/jpeg");

    expect(field).toHaveValue("image/png, image/jpeg");
    expect(onChange).toHaveBeenLastCalledWith(0, {
      constraints: { accepted_mimes: ["image/png", "image/jpeg"] },
    });
  });

  it("drops accepted_mimes (and empty constraints) when the text is cleared", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor([
      {
        key: "pic",
        label: "Picture",
        input: "file",
        constraints: { accepted_mimes: ["image/png"] },
      },
    ]);

    await user.clear(screen.getByLabelText(/Accepted MIME types/));

    expect(onChange).toHaveBeenLastCalledWith(0, { constraints: null });
  });

  it("preserves unrelated constraint keys when editing mimes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor([
      {
        key: "pic",
        label: "Picture",
        input: "file",
        constraints: { max_size: 1024 },
      },
    ]);

    await user.type(screen.getByLabelText(/Accepted MIME types/), "image/png");

    expect(onChange).toHaveBeenLastCalledWith(0, {
      constraints: { max_size: 1024, accepted_mimes: ["image/png"] },
    });
  });

  it("toggles required for a file input", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor([
      { key: "pic", label: "Picture", input: "file" },
    ]);

    await user.click(screen.getByLabelText("Required"));

    expect(onChange).toHaveBeenLastCalledWith(0, { required: true });
  });

  it("resyncs option text when an earlier row is removed (index-keyed reuse)", async () => {
    const user = userEvent.setup();
    // Two select rows; removing the first shifts the second into position 0,
    // where React reuses the first row's OptionsEditor instance.
    renderEditor([
      { key: "a", label: "A", input: "select", options: [{ value: "x" }] },
      { key: "b", label: "B", input: "select", options: [{ value: "y" }] },
    ]);

    await user.click(screen.getAllByLabelText("Remove input")[0]);
    // Row "b" was collapsed at index 1; expand it now that it sits at index 0.
    await user.click(screen.getByRole("button", { name: "b" }));

    // The surviving row must show its own options, not the removed row's buffer.
    expect(screen.getByLabelText("Options (comma-separated)")).toHaveValue("y");
  });

  it("collapses every row but the first", () => {
    renderEditor([
      { key: "a", label: "A", input: "text" },
      { key: "b", label: "B", input: "text" },
    ]);

    expect(screen.getByLabelText("Input Identifier")).toHaveValue("a");
    expect(screen.getByRole("button", { name: "b" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("counts every declared input", () => {
    renderEditor([
      { key: "input_1", label: "", input: "text" },
      { key: "tier", label: "Tier", input: "text" },
    ]);

    expect(
      screen.getByRole("heading", { name: "Workflow inputs (2)" })
    ).toBeInTheDocument();
  });
});
