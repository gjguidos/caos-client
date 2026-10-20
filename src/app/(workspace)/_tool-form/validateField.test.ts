import { describe, expect, it } from "vitest";
import type {
  NumberFieldConfig,
  TextFieldConfig,
  UIComponent,
} from "./toolForm.types";
import { fieldError, formErrors } from "./validateField";

function numberConfig(
  overrides: Partial<NumberFieldConfig> = {}
): NumberFieldConfig {
  return {
    key: "threshold",
    type: "number",
    widget: "NumberField",
    label: "Threshold",
    ...overrides,
  };
}

const TEXT_CONFIG: TextFieldConfig = {
  key: "topic",
  type: "text",
  widget: "TextField",
  label: "Topic",
  required: true,
};

describe("fieldError", () => {
  it("passes an empty optional field", () => {
    expect(fieldError(numberConfig(), undefined)).toBeNull();
  });

  it("reports an empty required field", () => {
    expect(fieldError(numberConfig({ required: true }), undefined)).toBe(
      "This field is required"
    );
  });

  it("treats whitespace as empty", () => {
    expect(fieldError(TEXT_CONFIG, "   ")).toBe("This field is required");
  });

  it("treats zero as filled", () => {
    expect(fieldError(numberConfig({ required: true }), 0)).toBeNull();
  });

  it("names both bounds when both are set", () => {
    const config = numberConfig({ min: 0, max: 1 });
    expect(fieldError(config, 1.5)).toBe("Enter a value between 0 and 1");
    expect(fieldError(config, -1)).toBe("Enter a value between 0 and 1");
    expect(fieldError(config, 0.5)).toBeNull();
  });

  it("names the only bound there is", () => {
    expect(fieldError(numberConfig({ min: 10 }), 9)).toBe(
      "Must be at least 10"
    );
    expect(fieldError(numberConfig({ max: 10 }), 11)).toBe(
      "Must be at most 10"
    );
  });

  it("accepts the bounds themselves", () => {
    const config = numberConfig({ min: 0, max: 1 });
    expect(fieldError(config, 0)).toBeNull();
    expect(fieldError(config, 1)).toBeNull();
  });
});

describe("formErrors", () => {
  const COMPONENTS: UIComponent[] = [
    {
      id: "topic",
      type: "text",
      widget: "TextField",
      group: "inputs",
      flag_config: { flag: "--topic", required: true },
      render_paths: [],
      slot_order: 0,
      props: { label: "Topic" },
    },
    {
      id: "threshold",
      type: "number",
      widget: "NumberField",
      group: "inputs",
      render_paths: [],
      slot_order: 1,
      props: { label: "Threshold", min: 0, max: 1 },
    },
  ];

  it("is empty for a valid form", () => {
    expect(formErrors(COMPONENTS, { topic: "Q3", threshold: 0.2 })).toEqual({});
  });

  it("collects every failing field, keyed by field key", () => {
    expect(formErrors(COMPONENTS, { threshold: 1.5 })).toEqual({
      topic: "This field is required",
      threshold: "Enter a value between 0 and 1",
    });
  });

  it("skips components that render outside the form", () => {
    const chatInput: UIComponent = {
      ...COMPONENTS[0],
      id: "prompt",
      group: null,
    };
    expect(formErrors([chatInput], {})).toEqual({});
  });
});
