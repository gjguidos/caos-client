import { describe, expect, it } from "vitest";
import { classifyStepArgs } from "./stepArgs";
import { TOOL_MODE_RENDER_PATH } from "@/app/(workspace)/_tool-form/lib/toolDisplayShared";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";

function makeTool(): ToolDefinition {
  const mode: UIComponent = {
    id: "mode",
    type: "free_text",
    widget: "PillGroup",
    group: null,
    flag_config: { flag: "--mode", required: true },
    render_paths: [TOOL_MODE_RENDER_PATH],
    slot_order: 0,
    props: {
      label: "Mode",
      options: [
        { value: "write", label: "Write" },
        { value: "rewrite", label: "Rewrite" },
      ],
    },
  };
  const tone: UIComponent = {
    id: "tone",
    type: "multiselect",
    widget: "CheckboxGroupField",
    group: "propertiesPanel.style",
    flag_config: { flag: "--tone_of_voice", required: false },
    render_paths: ["propertiesPanel.style"],
    slot_order: 5,
    props: {
      label: "Tone",
      options: [
        { value: "clear", label: "Clear" },
        { value: "warm", label: "Warm" },
      ],
    },
  };
  return {
    key: "writer",
    name: "writer",
    description: "",
    version: "1",
    ui: {
      components: [mode, tone],
      config: { chat_input: { id: "text", flag: "--text", required: true } },
    },
  };
}

const noLabels = () => undefined;

describe("classifyStepArgs", () => {
  it("classifies unset required args as missingRequired (label, id fallback)", () => {
    const args = classifyStepArgs(makeTool(), "@writer");
    const missing = args.filter((a) => a.kind === "missingRequired");
    expect(missing.map((a) => a.field).sort()).toEqual(["Mode", "text"]);
  });

  it("classifies an unset optional arg as optionalUnset", () => {
    const args = classifyStepArgs(makeTool(), "@writer");
    expect(args.find((a) => a.field === "Tone")?.kind).toBe("optionalUnset");
  });

  it("classifies literals, joining multiselect values", () => {
    const command =
      '@writer --mode=rewrite --text="hi" --tone_of_voice=clear,warm';
    const args = classifyStepArgs(makeTool(), command);
    expect(args.find((a) => a.field === "Mode")).toMatchObject({
      kind: "literal",
      value: "rewrite",
    });
    expect(args.find((a) => a.field === "Tone")).toMatchObject({
      kind: "literal",
      value: "clear, warm",
    });
  });

  it("classifies an ${inputs.…} binding with its input-key source", () => {
    const command = "@writer --mode=rewrite --text=${inputs.topic}";
    expect(
      classifyStepArgs(makeTool(), command).find((a) => a.field === "text")
    ).toMatchObject({
      componentId: "text",
      field: "text",
      kind: "binding",
      source: "inputs.topic",
      references: [{ kind: "input", key: "topic" }],
    });
  });

  it("treats a mixed expression as a literal, preserving the full text", () => {
    const command =
      '@writer --mode=rewrite --text="Summarize: ${outputs.s1.text}"';
    const text = classifyStepArgs(makeTool(), command).find(
      (a) => a.field === "text"
    );
    expect(text).toMatchObject({
      componentId: "text",
      field: "text",
      kind: "literal",
      value: "Summarize: ${outputs.s1.text}",
      references: [{ kind: "output", key: "s1", outputKey: "text" }],
    });
  });

  it("resolves an ${outputs.…} binding to the producer label, id fallback", () => {
    const command = "@writer --mode=rewrite --text=${outputs.step1.text}";
    const resolved = classifyStepArgs(makeTool(), command, (id) =>
      id === "step1" ? "Fetch" : undefined
    );
    expect(resolved.find((a) => a.field === "text")?.source).toBe("Fetch");
    const unresolved = classifyStepArgs(makeTool(), command, noLabels);
    expect(unresolved.find((a) => a.field === "text")?.source).toBe("step1");
  });

  it("treats a binding as set (not missingRequired)", () => {
    const command = "@writer --mode=rewrite --text=${inputs.topic}";
    const args = classifyStepArgs(makeTool(), command);
    expect(args.some((a) => a.kind === "missingRequired")).toBe(false);
  });
});
