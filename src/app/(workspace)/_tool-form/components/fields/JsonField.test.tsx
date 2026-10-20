import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonField } from "./JsonField";

function renderField(value?: string) {
  const onChange = vi.fn();
  render(
    <JsonField id="cfg" label="Config" value={value} onChange={onChange} />
  );
  return { onChange };
}

describe("JsonField", () => {
  it("emits typed text as a raw string", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField("");
    await user.type(screen.getByLabelText("Config"), "{{");
    expect(onChange).toHaveBeenCalledWith("{");
  });

  it("shows no error and no Format for empty (unset) input", () => {
    renderField("");
    expect(screen.queryByText("Invalid JSON")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
  });

  it("badges invalid JSON but never blocks editing", () => {
    renderField("{ not json");
    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
    // Advisory only: the textarea keeps the invalid text and stays editable.
    expect(screen.getByLabelText("Config")).toHaveValue("{ not json");
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
  });

  it("pretty-prints valid JSON on Format", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField('{"x":12,"y":20}');
    expect(screen.queryByText("Invalid JSON")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Format" }));
    expect(onChange).toHaveBeenCalledWith('{\n  "x": 12,\n  "y": 20\n}');
  });
});
