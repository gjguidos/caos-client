import { describe, expect, it } from "vitest";
import {
  collectPrefillableComponents,
  INPUT_GROUP,
  resolveModeLabel,
} from "./collectPrefillableComponents";
import { serializeUIComponents } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
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
    props: { options: [{ value: "clear", label: "Clear" }] },
  };

  return {
    key: "writer",
    name: "writer",
    description: "",
    version: "1",
    ui: {
      components: [mode, tone],
      config: {
        chat_input: { id: "text", flag: "--text", required: true },
        group_label_map: { "propertiesPanel.style": "Style" },
      },
    },
  };
}

describe("collectPrefillableComponents", () => {
  it("synthesizes the chat-input into a grouped field", () => {
    const { components } = collectPrefillableComponents(makeTool());
    const chatField = components.find((c) => c.id === "text");
    expect(chatField).toMatchObject({
      id: "text",
      group: INPUT_GROUP,
      widget: "TextArea",
      flag_config: { flag: "--text", required: true },
    });
  });

  it("rewrites the mode pill into a SelectField carrying its options", () => {
    const { components } = collectPrefillableComponents(makeTool());
    const mode = components.find((c) => c.id === "mode");
    expect(mode).toMatchObject({
      widget: "SelectField",
      type: "select",
      group: INPUT_GROUP,
      flag_config: { flag: "--mode", required: true },
    });
    expect(mode?.props.options).toHaveLength(2);
  });

  it("orders the synthetic Input group first (lowest slot_order)", () => {
    const { components } = collectPrefillableComponents(makeTool());
    const inputSlots = components
      .filter((c) => c.group === INPUT_GROUP)
      .map((c) => c.slot_order ?? 0);
    const otherSlots = components
      .filter((c) => c.group !== INPUT_GROUP)
      .map((c) => c.slot_order ?? 0);
    expect(Math.max(...inputSlots)).toBeLessThan(Math.min(...otherSlots));
  });

  it("preserves real propertiesPanel.* groups and labels", () => {
    const { components, groupLabelMap } =
      collectPrefillableComponents(makeTool());
    const tone = components.find((c) => c.id === "tone");
    expect(tone?.group).toBe("propertiesPanel.style");
    expect(groupLabelMap).toMatchObject({
      [INPUT_GROUP]: "Input",
      "propertiesPanel.style": "Style",
    });
  });

  it("dedupes repeated component ids so panel keys stay unique", () => {
    const tool = makeTool();
    // Backend payload repeats the mode pill (e.g. one entry per render path).
    tool.ui!.components = [
      ...tool.ui!.components!,
      { ...tool.ui!.components![0] },
    ];
    const { components } = collectPrefillableComponents(tool);
    const modeFields = components.filter((c) => c.id === "mode");
    expect(modeFields).toHaveLength(1);
    expect(new Set(components.map((c) => c.id)).size).toBe(components.length);
  });

  it("lets the synthetic chat-input win over a source component reusing its id", () => {
    const tool = makeTool();
    // A real component collides with the chat_input id ("text").
    tool.ui!.components = [
      ...tool.ui!.components!,
      {
        id: "text",
        type: "free_text",
        widget: "TextField",
        group: "propertiesPanel.style",
        flag_config: { flag: "--note", required: false },
        render_paths: ["propertiesPanel.style"],
        slot_order: 9,
        props: {},
      },
    ];
    const { components } = collectPrefillableComponents(tool);
    const textFields = components.filter((c) => c.id === "text");
    expect(textFields).toHaveLength(1);
    expect(textFields[0]).toMatchObject({
      group: INPUT_GROUP,
      widget: "TextArea",
    });
  });

  it("returns the chatInputConfig", () => {
    const { chatInputConfig } = collectPrefillableComponents(makeTool());
    expect(chatInputConfig).toEqual({
      id: "text",
      flag: "--text",
      required: true,
    });
  });

  it("emits no duplicate chat-input flag when fed back through the serializer", () => {
    const { components, chatInputConfig } =
      collectPrefillableComponents(makeTool());
    const command = serializeUIComponents(
      { text: "a story", mode: "rewrite", tone: ["clear"] },
      components,
      chatInputConfig,
      "writer"
    );
    expect(command).toBe(
      '@writer --mode=rewrite --tone_of_voice=clear --text="a story"'
    );
    expect(command.match(/--text=/g)).toHaveLength(1);
  });
});

describe("resolveModeLabel", () => {
  it("resolves the selected mode option's label", () => {
    expect(resolveModeLabel(makeTool(), { mode: "rewrite" })).toBe("Rewrite");
  });

  it("returns undefined when no mode is set", () => {
    expect(resolveModeLabel(makeTool(), {})).toBeUndefined();
  });
});
