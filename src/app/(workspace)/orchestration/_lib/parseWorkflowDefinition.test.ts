import { describe, expect, it } from "vitest";
import {
  extractWorkflowDefinition,
  extractWorkflowInputs,
  getWorkflowKeysFromAgent,
} from "./parseWorkflowDefinition";

// The catalog returns a flat WorkflowDocument, so each test passes the spec
// (`{ definition, inputs, ... }`) directly as the parser's input.

describe("getWorkflowKeysFromAgent", () => {
  it("reads the attached keys in the agent's order", () => {
    expect(
      getWorkflowKeysFromAgent({ workflows: ["mini_workflow_v1", "wf_x"] })
    ).toEqual(["mini_workflow_v1", "wf_x"]);
  });

  it.each([null, undefined, {}, { workflows: [] }])(
    "returns [] when no workflows are attached (%p)",
    (agent) => {
      expect(getWorkflowKeysFromAgent(agent as never)).toEqual([]);
    }
  );

  it("drops non-string and empty entries", () => {
    expect(
      getWorkflowKeysFromAgent({
        workflows: ["wf_a", "", null, 7, "wf_b"] as never,
      })
    ).toEqual(["wf_a", "wf_b"]);
  });
});

describe("extractWorkflowDefinition", () => {
  const def = {
    key: "wf",
    name: "wf",
    execution_mode: "sequential",
    steps: [{ id: "a", type: "tool" }],
  };

  it("reads the definition from the top-level WorkflowDocument", () => {
    expect(extractWorkflowDefinition({ definition: def })).toEqual(def);
  });

  it("returns null when no valid definition is present", () => {
    expect(extractWorkflowDefinition(null)).toBeNull();
    expect(extractWorkflowDefinition({})).toBeNull();
    expect(
      extractWorkflowDefinition({ definition: { steps: "nope" } })
    ).toBeNull();
  });
});

describe("extractWorkflowInputs", () => {
  it("returns [] when the workflow declares no inputs", () => {
    expect(extractWorkflowInputs(null)).toEqual([]);
    expect(extractWorkflowInputs({})).toEqual([]);
    expect(extractWorkflowInputs({ inputs: [] })).toEqual([]);
  });

  it("converts a WorkflowInputField (textarea, required, help)", () => {
    const fields = extractWorkflowInputs({
      inputs: [
        {
          key: "text",
          label: "Text",
          input: "textarea",
          required: true,
          help: "Text the workflow will write up.",
          default: null,
          constraints: null,
          options: null,
          source: null,
        },
      ],
    });
    expect(fields).toHaveLength(1);
    const [field] = fields;
    expect(field.id).toBe("text");
    expect(field.widget).toBe("TextArea");
    expect(field.type).toBe("text");
    expect(field.group).toBe("inputs");
    expect(field.flag_config).toEqual({ flag: "--text", required: true });
    expect(field.props.label).toBe("Text");
    expect(field.props.placeholder).toBe("Text the workflow will write up.");
  });

  it("maps each input type to its widget", () => {
    const fields = extractWorkflowInputs({
      inputs: [
        { key: "a", input: "text" },
        { key: "b", input: "textarea" },
        { key: "c", input: "number" },
        { key: "d", input: "select", options: [{ value: "x", label: "X" }] },
        { key: "f" },
        { key: "g", input: "multiselect", options: [{ value: "x" }] },
        { key: "h", input: "object" },
        { key: "i", input: "file" },
      ],
    });
    const byId = Object.fromEntries(fields.map((f) => [f.id, f.widget]));
    expect(byId).toEqual({
      a: "TextField",
      b: "TextArea",
      c: "NumberField",
      d: "SelectField",
      f: "TextField",
      g: "CheckboxGroupField",
      h: "JsonField",
      i: "FileField",
    });
  });

  it("maps an object input to the JsonField widget and type", () => {
    const [field] = extractWorkflowInputs({
      inputs: [{ key: "payload", input: "object" }],
    });
    expect(field.widget).toBe("JsonField");
    expect(field.type).toBe("object");
  });

  it("carries the number constraints the form validates against (min/max)", () => {
    const [field] = extractWorkflowInputs({
      inputs: [
        {
          key: "count",
          input: "number",
          constraints: { min: 1, max: 10, step: 2 },
        },
      ],
    });
    expect(field.props.min).toBe(1);
    expect(field.props.max).toBe(10);
    // `step` is not carried: the field is a text input with its own draft
    // parsing, so there is no stepper for it to drive.
    expect(field.props.step).toBeUndefined();
  });

  it("normalizes select options to {value,label}", () => {
    const [field] = extractWorkflowInputs({
      inputs: [
        {
          key: "tier",
          input: "select",
          options: [{ value: "gold", label: "Gold" }, { value: "silver" }],
        },
      ],
    });
    expect(field.props.options).toEqual([
      { value: "gold", label: "Gold" },
      { value: "silver", label: "silver" },
    ]);
  });

  it("maps a file input to FileField and threads mimes + upload target", () => {
    const [field] = extractWorkflowInputs({
      key: "wf_report",
      inputs: [
        {
          key: "source_image",
          label: "Source image",
          input: "file",
          required: true,
          constraints: { accepted_mimes: ["image/png", "image/jpeg"] },
        },
      ],
    });
    expect(field.widget).toBe("FileField");
    expect(field.type).toBe("file");
    expect(field.flag_config).toEqual({
      flag: "--source_image",
      required: true,
    });
    expect(field.props.acceptedMimes).toEqual(["image/png", "image/jpeg"]);
    expect(field.props.uploadTarget).toBe("wf_report");
  });

  it("omits file props when constraints are malformed and the key is absent", () => {
    const [field] = extractWorkflowInputs({
      inputs: [
        {
          key: "pic",
          input: "file",
          constraints: { accepted_mimes: "image/png" },
        },
      ],
    });
    expect(field.widget).toBe("FileField");
    expect(field.props.acceptedMimes).toBeUndefined();
    expect(field.props.uploadTarget).toBeUndefined();
  });

  it("preserves declaration order via slot_order", () => {
    const fields = extractWorkflowInputs({
      inputs: [{ key: "a" }, { key: "b" }, { key: "c" }],
    });
    expect(fields.map((f) => f.slot_order)).toEqual([0, 1, 2]);
  });
});
