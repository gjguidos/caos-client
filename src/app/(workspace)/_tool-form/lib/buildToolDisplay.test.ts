import { describe, expect, it } from "vitest";
import { buildToolDisplay } from "./buildToolDisplay";
import { TOOL_MODE_RENDER_PATH } from "./toolDisplayShared";
import type {
  ChatInputConfig,
  FormValues,
  UIComponent,
} from "../toolForm.types";

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
  id = "mode",
  options: { value: string; label?: string }[] = []
): UIComponent {
  return makeComponent(id, {
    type: "select",
    flag_config: { flag: "--mode", required: true },
    render_paths: [TOOL_MODE_RENDER_PATH],
    props: { options },
  });
}

describe("buildToolDisplay", () => {
  it("builds a display for a tool that has no mode component", () => {
    const components = [
      makeComponent("text", {
        flag_config: { flag: "--text", required: false },
      }),
    ];
    const result = buildToolDisplay({ text: "hi" }, components, "Writer");
    expect(result).toEqual({
      toolName: "Writer",
      prompt: undefined,
      fields: [{ label: "text", value: "hi" }],
    });
  });

  it("uses the tool name alone as the header (mode is not in the header)", () => {
    const components = [
      modeComponent("mode", [{ value: "write", label: "Write" }]),
    ];
    const result = buildToolDisplay({ mode: "write" }, components, "Writer");
    expect(result?.toolName).toBe("Writer");
  });

  it("shows the mode as a regular field like any other parameter", () => {
    const components = [
      modeComponent("mode", [{ value: "write", label: "Write" }]),
    ];
    const result = buildToolDisplay({ mode: "write" }, components, "Writer");
    expect(result?.fields).toEqual([{ label: "mode", value: "write" }]);
  });

  it("omits the mode field when its value is empty", () => {
    const components = [
      modeComponent("mode", [{ value: "write", label: "Write" }]),
    ];
    const result = buildToolDisplay({ mode: "" }, components, "Writer");
    expect(result?.fields).toEqual([]);
  });

  it("carries the chat input as the prompt, apart from the setting fields", () => {
    const components = [modeComponent("mode", [{ value: "write" }])];
    const chatInputConfig: ChatInputConfig = {
      id: "chat",
      flag: "--text",
      required: false,
    };
    const values: FormValues = { mode: "write", chat: "a story" };
    const result = buildToolDisplay(
      values,
      components,
      "Writer",
      chatInputConfig
    );
    expect(result?.prompt).toBe("a story");
    expect(result?.fields).toEqual([{ label: "mode", value: "write" }]);
  });

  it("leaves the prompt undefined when the chat input is empty", () => {
    const components = [modeComponent("mode", [{ value: "write" }])];
    const chatInputConfig: ChatInputConfig = {
      id: "chat",
      flag: "--text",
      required: false,
    };
    const result = buildToolDisplay(
      { mode: "write" },
      components,
      "Writer",
      chatInputConfig
    );
    expect(result?.prompt).toBeUndefined();
    expect(result?.fields).toEqual([{ label: "mode", value: "write" }]);
  });

  it("collects flagged params with non-empty values, sorted by slot_order", () => {
    const components = [
      makeComponent("tone", {
        flag_config: { flag: "--tone", required: false },
        slot_order: 2,
        props: { label: "Tone" },
      }),
      makeComponent("audience", {
        flag_config: { flag: "--audience", required: false },
        slot_order: 1,
        props: { label: "Audience" },
      }),
    ];
    const values: FormValues = {
      tone: "formal",
      audience: "kids",
    };
    const result = buildToolDisplay(values, components, "Writer");
    expect(result?.fields).toEqual([
      { label: "Audience", value: "kids" },
      { label: "Tone", value: "formal" },
    ]);
  });

  it("joins array values with a comma and space", () => {
    const components = [
      makeComponent("tags", {
        type: "multiselect",
        flag_config: { flag: "--tags", required: false },
        slot_order: 1,
        props: { label: "Tags" },
      }),
    ];
    const values: FormValues = { tags: ["clear", "curious"] };
    const result = buildToolDisplay(values, components, "Writer");
    expect(result?.fields).toEqual([
      { label: "Tags", value: "clear, curious" },
    ]);
  });

  it("never duplicates the chat-input component as a param field", () => {
    const components = [
      makeComponent("chat", {
        flag_config: { flag: "--text", required: false },
      }),
    ];
    const chatInputConfig: ChatInputConfig = {
      id: "chat",
      flag: "--text",
      required: false,
    };
    const values: FormValues = { chat: "hello" };
    const result = buildToolDisplay(
      values,
      components,
      "Writer",
      chatInputConfig
    );
    // "chat" leaves as the prompt, never again as a param field
    expect(result?.prompt).toBe("hello");
    expect(result?.fields).toEqual([]);
  });

  it("skips param components that have no flag_config", () => {
    const components = [
      makeComponent("noflag", { slot_order: 1, props: { label: "NoFlag" } }),
    ];
    const values: FormValues = { noflag: "ignored" };
    const result = buildToolDisplay(values, components, "Writer");
    expect(result?.fields).toEqual([]);
  });

  it("uses the component id as the label when props.label is absent", () => {
    const components = [
      makeComponent("tone", {
        flag_config: { flag: "--tone", required: false },
        slot_order: 1,
      }),
    ];
    const values: FormValues = { tone: "formal" };
    const result = buildToolDisplay(values, components, "Writer");
    expect(result?.fields).toEqual([{ label: "tone", value: "formal" }]);
  });
});
