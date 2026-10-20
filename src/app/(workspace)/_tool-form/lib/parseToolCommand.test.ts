import { describe, expect, it } from "vitest";
import { findToolDisplayFromCommand } from "./parseToolCommand";
import { TOOL_MODE_RENDER_PATH } from "./toolDisplayShared";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import type { UIComponent } from "../toolForm.types";

function makeComponent(
  id: string,
  overrides: Partial<UIComponent> = {}
): UIComponent {
  return {
    id,
    type: "text",
    widget: "TextField",
    group: null,
    render_paths: [],
    slot_order: null,
    props: {},
    ...overrides,
  };
}

function modeComponent(
  options: { value: string; label?: string }[]
): UIComponent {
  return makeComponent("mode", {
    type: "select",
    flag_config: { flag: "--mode", required: true },
    render_paths: [TOOL_MODE_RENDER_PATH],
    props: { options },
  });
}

function makeTool(overrides: Partial<EnrichedTool> = {}): EnrichedTool {
  return {
    key: "writer",
    label: "Writer",
    description: "",
    version: "1",
    trigger_words: [],
    ...overrides,
  };
}

describe("findToolDisplayFromCommand", () => {
  it("returns undefined when the message does not start with @", () => {
    const tools = [makeTool({ ui: [modeComponent([{ value: "write" }])] })];
    expect(findToolDisplayFromCommand("just text", tools)).toBeUndefined();
  });

  it("returns undefined when no tool matches the @<key> token", () => {
    const tools = [makeTool({ ui: [modeComponent([{ value: "write" }])] })];
    expect(
      findToolDisplayFromCommand("@unknown --mode=write", tools)
    ).toBeUndefined();
  });

  it("returns undefined when the matched tool has no ui", () => {
    const tools = [makeTool({ ui: undefined })];
    expect(
      findToolDisplayFromCommand("@writer --mode=write", tools)
    ).toBeUndefined();
  });

  it("matches the tool by its canonical key, ignoring others", () => {
    const tools = [
      makeTool({ key: "other", ui: [makeComponent("x")] }),
      makeTool({
        key: "writer",
        label: "Writer",
        ui: [modeComponent([{ value: "write", label: "Write" }])],
      }),
    ];
    const result = findToolDisplayFromCommand("@writer --mode=write", tools);
    expect(result?.toolName).toBe("Writer");
  });

  it("uses the tool label alone as the header (mode is not in the header)", () => {
    const tools = [
      makeTool({ ui: [modeComponent([{ value: "write", label: "Write" }])] }),
    ];
    const result = findToolDisplayFromCommand("@writer --mode=write", tools);
    expect(result?.toolName).toBe("Writer");
  });

  it("shows the --mode value as a regular field like any other parameter", () => {
    const tools = [
      makeTool({ ui: [modeComponent([{ value: "write", label: "Write" }])] }),
    ];
    const result = findToolDisplayFromCommand("@writer --mode=write", tools);
    expect(result?.fields).toEqual([{ label: "mode", value: "write" }]);
  });

  it("uses the bare tool label when no --mode flag is present", () => {
    const tools = [
      makeTool({ ui: [modeComponent([{ value: "write", label: "Write" }])] }),
    ];
    const result = findToolDisplayFromCommand("@writer", tools);
    expect(result?.toolName).toBe("Writer");
    expect(result?.fields).toEqual([]);
  });

  it("parses unquoted and quoted flag values, unescaping inner quotes", () => {
    const tools = [
      makeTool({
        ui: [
          modeComponent([{ value: "write" }]),
          makeComponent("tone", {
            flag_config: { flag: "--tone", required: false },
            slot_order: 1,
            props: { label: "Tone" },
          }),
          makeComponent("title", {
            flag_config: { flag: "--title", required: false },
            slot_order: 2,
            props: { label: "Title" },
          }),
        ],
      }),
    ];
    const result = findToolDisplayFromCommand(
      '@writer --mode=write --tone=formal --title="A \\"big\\" story"',
      tools
    );
    expect(result?.fields).toEqual([
      { label: "mode", value: "write" },
      { label: "Tone", value: "formal" },
      { label: "Title", value: 'A "big" story' },
    ]);
  });

  it("emits the chat input field first from uiChatInput flag", () => {
    const tools = [
      makeTool({
        uiChatInput: { id: "chat", flag: "--text", required: false },
        ui: [
          modeComponent([{ value: "write" }]),
          makeComponent("chat", {
            flag_config: { flag: "--text", required: false },
          }),
        ],
      }),
    ];
    const result = findToolDisplayFromCommand(
      '@writer --mode=write --text="a story"',
      tools
    );
    expect(result?.prompt).toBe("a story");
    expect(result?.fields).toEqual([{ label: "mode", value: "write" }]);
  });

  it("formats multiselect values as comma-space separated", () => {
    const tools = [
      makeTool({
        ui: [
          modeComponent([{ value: "write" }]),
          makeComponent("tags", {
            type: "multiselect",
            flag_config: { flag: "--tags", required: false },
            slot_order: 1,
            props: { label: "Tags" },
          }),
        ],
      }),
    ];
    const result = findToolDisplayFromCommand(
      "@writer --mode=write --tags=clear,curious",
      tools
    );
    expect(result?.fields).toEqual([
      { label: "mode", value: "write" },
      { label: "Tags", value: "clear, curious" },
    ]);
  });

  it("sorts param fields by slot_order", () => {
    const tools = [
      makeTool({
        ui: [
          makeComponent("b", {
            flag_config: { flag: "--bb", required: false },
            slot_order: 2,
            props: { label: "B" },
          }),
          makeComponent("a", {
            flag_config: { flag: "--aa", required: false },
            slot_order: 1,
            props: { label: "A" },
          }),
        ],
      }),
    ];
    const result = findToolDisplayFromCommand("@writer --bb=2 --aa=1", tools);
    expect(result?.fields).toEqual([
      { label: "A", value: "1" },
      { label: "B", value: "2" },
    ]);
  });

  it("skips param components whose flag has no value in the command", () => {
    const tools = [
      makeTool({
        ui: [
          makeComponent("tone", {
            flag_config: { flag: "--tone", required: false },
            slot_order: 1,
            props: { label: "Tone" },
          }),
        ],
      }),
    ];
    const result = findToolDisplayFromCommand("@writer", tools);
    expect(result?.fields).toEqual([]);
  });

  it("does not duplicate the chat input flag as a param field", () => {
    const tools = [
      makeTool({
        uiChatInput: { id: "chat", flag: "--text", required: false },
        ui: [
          makeComponent("chat", {
            flag_config: { flag: "--text", required: false },
            slot_order: 1,
            props: { label: "Chat" },
          }),
        ],
      }),
    ];
    const result = findToolDisplayFromCommand('@writer --text="hello"', tools);
    expect(result?.prompt).toBe("hello");
    expect(result?.fields).toEqual([]);
  });
});
