import { describe, expect, it } from "vitest";
import { validateRequiredInputs } from "./validateRequiredInputs";
import { TOOL_MODE_RENDER_PATH } from "@/app/(workspace)/_tool-form/lib/toolDisplayShared";
import type { BuilderNodeData } from "./builderGraph";
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
    props: { label: "Mode", options: [{ value: "rewrite", label: "Rewrite" }] },
  };
  return {
    key: "writer",
    name: "writer",
    description: "",
    version: "1",
    ui: {
      components: [mode],
      config: { chat_input: { id: "text", flag: "--text", required: true } },
    },
  };
}

function toolNode(id: string, command: string) {
  return {
    id,
    data: {
      stepType: "tool",
      label: "Writer",
      command,
      toolName: "writer",
    } as BuilderNodeData,
  };
}

describe("validateRequiredInputs", () => {
  const tools = [makeTool()];

  it("flags a tool node missing required args", () => {
    const result = validateRequiredInputs([toolNode("a", "@writer")], tools);
    expect(result.has("a")).toBe(true);
    expect(result.get("a")?.[0]).toMatchObject({
      code: "MISSING_REQUIRED_INPUT",
    });
    expect(result.get("a")?.[0].message).toContain("Mode");
  });

  it("passes a fully-configured tool node", () => {
    const node = toolNode("a", '@writer --mode=rewrite --text="hi"');
    expect(validateRequiredInputs([node], tools).size).toBe(0);
  });

  it("skips structural steps", () => {
    const node = {
      id: "p",
      data: { stepType: "pause", label: "Pause" } as BuilderNodeData,
    };
    expect(validateRequiredInputs([node], tools).size).toBe(0);
  });

  it("skips tool nodes whose tool is not registered", () => {
    const node = {
      id: "x",
      data: {
        stepType: "tool",
        label: "Ghost",
        command: "@ghost",
        toolName: "ghost",
      } as BuilderNodeData,
    };
    expect(validateRequiredInputs([node], tools).size).toBe(0);
  });
});
