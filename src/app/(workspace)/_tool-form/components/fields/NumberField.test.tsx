import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NumberFieldConfig } from "@/app/(workspace)/_tool-form/toolForm.types";
import { fieldError } from "@/app/(workspace)/_tool-form/validateField";
import { NumberField } from "./NumberField";

const onChange = vi.fn();

/**
 * Controlled harness: the emitted value is fed straight back in as the prop, and
 * the error comes from the shared validator exactly as `FieldRenderer` supplies
 * it. That round-trip is where the decimal point used to be lost, so a test that
 * renders `NumberField` uncontrolled would pass against the broken version.
 */
function ControlledField({
  initial,
  required = false,
  min,
  max,
}: Readonly<{
  initial?: number;
  required?: boolean;
  min?: number;
  max?: number;
}>) {
  const [value, setValue] = useState<number | undefined>(initial);
  const config: NumberFieldConfig = {
    key: "threshold",
    type: "number",
    widget: "NumberField",
    label: "Threshold",
    required,
    min,
    max,
  };
  return (
    <NumberField
      id="threshold"
      label="Threshold"
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      required={required}
      min={min}
      max={max}
      error={fieldError(config, value)}
    />
  );
}

function renderControlled(props: Parameters<typeof ControlledField>[0] = {}) {
  onChange.mockClear();
  render(<ControlledField {...props} />);
  return screen.getByLabelText(/Threshold/);
}

describe("NumberField", () => {
  it("accepts a decimal typed one character at a time", async () => {
    const user = userEvent.setup();
    const input = renderControlled();

    await user.type(input, "0.2");

    expect(input).toHaveValue("0.2");
    expect(onChange).toHaveBeenLastCalledWith(0.2);
  });

  it("accepts a leading decimal point", async () => {
    const user = userEvent.setup();
    const input = renderControlled();

    await user.type(input, ".5");

    expect(input).toHaveValue(".5");
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it("keeps a trailing zero while emitting the parsed number", async () => {
    const user = userEvent.setup();
    const input = renderControlled();

    await user.type(input, "0.20");

    expect(input).toHaveValue("0.20");
    expect(onChange).toHaveBeenLastCalledWith(0.2);
  });

  it("accepts a negative value", async () => {
    const user = userEvent.setup();
    const input = renderControlled();

    await user.type(input, "-1.5");

    expect(input).toHaveValue("-1.5");
    expect(onChange).toHaveBeenLastCalledWith(-1.5);
  });

  it("ignores non-numeric keystrokes", async () => {
    const user = userEvent.setup();
    const input = renderControlled();

    await user.type(input, "1a2");

    expect(input).toHaveValue("12");
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it("emits undefined when cleared", async () => {
    const user = userEvent.setup();
    const input = renderControlled({ initial: 0.2 });

    await user.clear(input);

    expect(input).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("resyncs the text on an external value change", () => {
    const { rerender } = render(
      <NumberField
        id="threshold"
        label="Threshold"
        value={0.2}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Threshold")).toHaveValue("0.2");

    rerender(
      <NumberField
        id="threshold"
        label="Threshold"
        value={0.8}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Threshold")).toHaveValue("0.8");
  });

  it("does not flag an empty optional field", () => {
    renderControlled({ min: 0, max: 1 });
    expect(
      screen.queryByText("This field is required")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Enter a value between 0 and 1")
    ).not.toBeInTheDocument();
  });

  it("leaves an untouched required field alone", () => {
    renderControlled({ required: true });
    expect(
      screen.queryByText("This field is required")
    ).not.toBeInTheDocument();
  });

  it("flags a required field once it has been emptied", async () => {
    const user = userEvent.setup();
    const input = renderControlled({ required: true, initial: 0.2 });

    await user.clear(input);

    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("stays quiet while a draft is on its way to a number", async () => {
    const user = userEvent.setup();
    const input = renderControlled({ required: true });

    await user.type(input, "-");

    expect(
      screen.queryByText("This field is required")
    ).not.toBeInTheDocument();
  });

  it("flags a value outside the range", () => {
    renderControlled({ initial: 1.5, min: 0, max: 1 });
    expect(
      screen.getByText("Enter a value between 0 and 1")
    ).toBeInTheDocument();
  });

  it("accepts a value inside the range", () => {
    renderControlled({ initial: 0.2, min: 0, max: 1 });
    expect(
      screen.queryByText("Enter a value between 0 and 1")
    ).not.toBeInTheDocument();
  });
});
