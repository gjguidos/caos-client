import { describe, expect, it } from "vitest";
import { parseCommandToValues } from "./parseCommandToValues";
import { serializeUIComponents } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import type {
  ChatInputConfig,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

function component(
  id: string,
  flag: string,
  overrides: Partial<UIComponent> = {}
): UIComponent {
  return {
    id,
    type: "text",
    widget: "TextField",
    group: "propertiesPanel.main",
    flag_config: { flag, required: false },
    render_paths: [],
    slot_order: 0,
    props: {},
    ...overrides,
  };
}

const chatInput: ChatInputConfig = {
  id: "text",
  flag: "--text",
  required: true,
};

describe("parseCommandToValues", () => {
  it("parses flags back onto component ids, coercing by type", () => {
    const components = [
      component("mode", "--mode", { type: "select", widget: "SelectField" }),
      component("count", "--count", { type: "number", widget: "NumberField" }),
      component("tone", "--tone_of_voice", {
        type: "multiselect",
        widget: "CheckboxGroupField",
      }),
    ];
    const command =
      "@writer --mode=rewrite --count=3 --tone_of_voice=clear,curious";

    expect(parseCommandToValues(command, components, chatInput)).toEqual({
      mode: "rewrite",
      count: 3,
      tone: ["clear", "curious"],
    });
  });

  it("maps the chat-input flag onto chatInputConfig.id", () => {
    const command = '@writer --text="a story"';
    expect(parseCommandToValues(command, [], chatInput)).toEqual({
      text: "a story",
    });
  });

  it("ignores flags with no matching component", () => {
    const components = [component("known", "--known")];
    const command = "@writer --known=x --unknown=y";
    expect(parseCommandToValues(command, components, null)).toEqual({
      known: "x",
    });
  });

  describe("round-trips with serializeUIComponents", () => {
    const components = [
      component("text", "--text", { type: "text" }),
      component("mode", "--mode", { type: "select", widget: "SelectField" }),
      component("count", "--count", { type: "number", widget: "NumberField" }),
      component("tone", "--tone_of_voice", {
        type: "multiselect",
        widget: "CheckboxGroupField",
      }),
      component("note", "--note", { type: "text" }),
    ];

    const roundTrip = (values: FormValues) => {
      const command = serializeUIComponents(
        values,
        components,
        chatInput,
        "writer"
      );
      return parseCommandToValues(command, components, chatInput);
    };

    it("preserves text, number, multiselect, and mode values", () => {
      const values: FormValues = {
        text: "hello world",
        mode: "rewrite",
        count: 7,
        tone: ["clear", "curious"],
      };
      expect(roundTrip(values)).toEqual(values);
    });

    it("preserves values that need quoting", () => {
      const values: FormValues = { note: 'he said "hi" there' };
      expect(roundTrip(values)).toEqual(values);
    });

    it("drops empty values (omitted from the command)", () => {
      const values: FormValues = { text: "kept", note: "", count: undefined };
      expect(roundTrip(values)).toEqual({ text: "kept" });
    });

    it("keeps `${…}` references as raw strings (no coercion damage)", () => {
      const values: FormValues = {
        text: "${inputs.topic}",
        count: "${inputs.count}",
        tone: "${outputs.s1.text}",
      };
      // Number and multiselect references survive unsplit / un-Number()'d.
      expect(roundTrip(values)).toEqual(values);
    });

    it("round-trips a reference with an inline default containing spaces", () => {
      const values: FormValues = { note: "${inputs.topic|Untitled draft}" };
      expect(roundTrip(values)).toEqual(values);
    });

    it("round-trips a value mixing literal text and a reference", () => {
      const values: FormValues = { note: "Summarize: ${outputs.s1.text}" };
      expect(roundTrip(values)).toEqual(values);
    });
  });
});
