import { describe, expect, it } from "vitest";
import {
  createEmptyUIComponentValues,
  createPostSubmitValues,
  hasAnyUIComponentValues,
  hasRequiredUIComponentValues,
  serializeUIComponents,
} from "./uiComponentSerializer";
import type { FormValues, UIComponent } from "../toolForm.types";

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

function withFlag(
  id: string,
  flag: string,
  required = false,
  overrides: Partial<UIComponent> = {}
): UIComponent {
  return makeComponent(id, {
    flag_config: { flag, required },
    ...overrides,
  });
}

describe("serializeUIComponents", () => {
  it("serializes a single --flag=value field", () => {
    const components = [withFlag("text", "--text")];
    const values: FormValues = { text: "hello" };
    expect(serializeUIComponents(values, components)).toBe("--text=hello");
  });

  it("quote-wraps a JSON object value so it survives as one flag arg", () => {
    const components = [
      withFlag("payload", "--payload", false, {
        type: "object",
        widget: "JsonField",
      }),
    ];
    const values: FormValues = { payload: '{"a":"b c"}' };
    expect(serializeUIComponents(values, components)).toBe(
      '--payload="{\\"a\\":\\"b c\\"}"'
    );
  });

  it("emits the mode component's value as a --mode flag", () => {
    const components = [withFlag("mode", "--mode", true)];
    const values: FormValues = { mode: "write" };
    expect(serializeUIComponents(values, components)).toBe("--mode=write");
  });

  it("prefixes the @<toolKey> token when a tool key is provided", () => {
    const components = [withFlag("mode", "--mode", true)];
    const values: FormValues = { mode: "rewrite" };
    expect(serializeUIComponents(values, components, undefined, "writer")).toBe(
      "@writer --mode=rewrite"
    );
  });

  it("emits flags in component order after the token", () => {
    const components = [
      withFlag("text", "--text"),
      withFlag("mode", "--mode", true),
    ];
    const values: FormValues = { text: "hello", mode: "write" };
    expect(serializeUIComponents(values, components, undefined, "writer")).toBe(
      "@writer --text=hello --mode=write"
    );
  });

  it("joins multiple fields with a single space", () => {
    const components = [withFlag("a", "--aa"), withFlag("b", "--bb")];
    const values: FormValues = { a: "x", b: "y" };
    expect(serializeUIComponents(values, components)).toBe("--aa=x --bb=y");
  });

  it("skips components without flag_config", () => {
    const components = [makeComponent("noflag"), withFlag("text", "--text")];
    const values: FormValues = { noflag: "ignored", text: "hello" };
    expect(serializeUIComponents(values, components)).toBe("--text=hello");
  });

  it("skips undefined values", () => {
    const components = [withFlag("a", "--aa"), withFlag("b", "--bb")];
    const values: FormValues = { a: "x", b: undefined };
    expect(serializeUIComponents(values, components)).toBe("--aa=x");
  });

  it("skips null values", () => {
    const components = [withFlag("a", "--aa")];
    const values = { a: null } as unknown as FormValues;
    expect(serializeUIComponents(values, components)).toBe("");
  });

  it("skips empty-string values", () => {
    const components = [withFlag("a", "--aa"), withFlag("b", "--bb")];
    const values: FormValues = { a: "", b: "y" };
    expect(serializeUIComponents(values, components)).toBe("--bb=y");
  });

  it("skips empty-array values", () => {
    const components = [withFlag("a", "--aa")];
    const values: FormValues = { a: [] };
    expect(serializeUIComponents(values, components)).toBe("");
  });

  it("quotes values containing spaces", () => {
    const components = [withFlag("text", "--text")];
    const values: FormValues = { text: "a story" };
    expect(serializeUIComponents(values, components)).toBe('--text="a story"');
  });

  it("quotes values containing double quotes", () => {
    const components = [withFlag("text", "--text")];
    const values: FormValues = { text: 'say "hello"' };
    expect(serializeUIComponents(values, components)).toBe(
      '--text="say \\"hello\\""'
    );
  });

  it("quotes values containing single quotes", () => {
    const components = [withFlag("text", "--text")];
    const values: FormValues = { text: "it's fine" };
    expect(serializeUIComponents(values, components)).toBe(
      '--text="it\'s fine"'
    );
  });

  it("handles array values joined with comma and no spaces", () => {
    const components = [withFlag("tags", "--tags")];
    const values: FormValues = { tags: ["clear", "curious"] };
    expect(serializeUIComponents(values, components)).toBe(
      "--tags=clear,curious"
    );
  });

  it("handles numeric values", () => {
    const components = [
      withFlag("limit", "--limit", false, { type: "number" }),
    ];
    const values: FormValues = { limit: 42 };
    expect(serializeUIComponents(values, components)).toBe("--limit=42");
  });

  it("returns empty string when all values are empty", () => {
    const components = [withFlag("a", "--aa"), withFlag("b", "--bb")];
    const values: FormValues = { a: undefined, b: undefined };
    expect(serializeUIComponents(values, components)).toBe("");
  });

  it("returns empty string for empty components array", () => {
    expect(serializeUIComponents({}, [])).toBe("");
  });
});

describe("serializeUIComponents — with chatInputConfig", () => {
  const chatInput = { id: "chat_input", flag: "--text", required: true };

  it("emits the chatInputConfig flag last, after the component flags", () => {
    const components = [
      withFlag("mode", "--mode", true),
      withFlag("max_char_length", "--max_char_length"),
    ];
    const values: FormValues = {
      mode: "write",
      chat_input: "hello world",
      max_char_length: 5000,
    };
    expect(serializeUIComponents(values, components, chatInput, "writer")).toBe(
      '@writer --mode=write --max_char_length=5000 --text="hello world"'
    );
  });

  it("skips a UIComponent whose flag matches chatInputConfig flag", () => {
    const components = [withFlag("text", "--text", true)];
    const values: FormValues = { chat_input: "hello", text: undefined };
    expect(serializeUIComponents(values, components, chatInput)).toBe(
      "--text=hello"
    );
  });

  it("omits chatInputConfig when its value is empty", () => {
    const components = [withFlag("mode", "--mode", true)];
    const values: FormValues = { mode: "write", chat_input: "" };
    expect(serializeUIComponents(values, components, chatInput, "writer")).toBe(
      "@writer --mode=write"
    );
  });

  it("works with no UIComponents", () => {
    const values: FormValues = { chat_input: "just text" };
    expect(serializeUIComponents(values, [], chatInput)).toBe(
      '--text="just text"'
    );
  });
});

describe("hasRequiredUIComponentValues", () => {
  it("returns true when all required fields have values", () => {
    const components = [
      withFlag("a", "--aa", true),
      withFlag("b", "--bb", true),
    ];
    const values: FormValues = { a: "x", b: "y" };
    expect(hasRequiredUIComponentValues(values, components)).toBe(true);
  });

  it("returns false when a required field is undefined", () => {
    const components = [withFlag("a", "--aa", true)];
    const values: FormValues = { a: undefined };
    expect(hasRequiredUIComponentValues(values, components)).toBe(false);
  });

  it("returns false when a required field is empty string", () => {
    const components = [withFlag("a", "--aa", true)];
    const values: FormValues = { a: "" };
    expect(hasRequiredUIComponentValues(values, components)).toBe(false);
  });

  it("returns false when a required field is empty array", () => {
    const components = [withFlag("a", "--aa", true)];
    const values: FormValues = { a: [] };
    expect(hasRequiredUIComponentValues(values, components)).toBe(false);
  });

  it("ignores non-required fields", () => {
    const components = [
      withFlag("required", "--req", true),
      withFlag("optional", "--opt", false),
    ];
    const values: FormValues = { required: "filled", optional: undefined };
    expect(hasRequiredUIComponentValues(values, components)).toBe(true);
  });

  it("returns true when there are no required fields", () => {
    const components = [withFlag("a", "--aa", false)];
    const values: FormValues = { a: undefined };
    expect(hasRequiredUIComponentValues(values, components)).toBe(true);
  });

  it("returns true for empty components array", () => {
    expect(hasRequiredUIComponentValues({}, [])).toBe(true);
  });

  describe("with chatInputConfig", () => {
    const chatInput = { id: "chat_input", flag: "--text", required: true };

    it("returns false when chatInputConfig is required and value is empty", () => {
      expect(
        hasRequiredUIComponentValues({ chat_input: "" }, [], chatInput)
      ).toBe(false);
    });

    it("returns true when chatInputConfig is required and value is non-empty", () => {
      expect(
        hasRequiredUIComponentValues({ chat_input: "hello" }, [], chatInput)
      ).toBe(true);
    });

    it("returns true when chatInputConfig is not required and value is empty", () => {
      const optional = { ...chatInput, required: false };
      expect(
        hasRequiredUIComponentValues({ chat_input: "" }, [], optional)
      ).toBe(true);
    });

    it("skips a UIComponent whose flag matches chatInputConfig flag even if required", () => {
      const components = [withFlag("text", "--text", true)];
      // values["text"] is empty — would normally block submit — but it's skipped
      // because chatInputConfig covers this flag
      expect(
        hasRequiredUIComponentValues(
          { text: undefined, chat_input: "hello" },
          components,
          chatInput
        )
      ).toBe(true);
    });

    it("still validates other required UIComponents alongside chatInputConfig", () => {
      const components = [withFlag("mode", "--mode", true)];
      expect(
        hasRequiredUIComponentValues(
          { mode: undefined, chat_input: "hello" },
          components,
          chatInput
        )
      ).toBe(false);
    });
  });
});

describe("hasAnyUIComponentValues", () => {
  it("returns true when at least one component has a non-empty value", () => {
    const components = [makeComponent("a"), makeComponent("b")];
    const values: FormValues = { a: undefined, b: "filled" };
    expect(hasAnyUIComponentValues(values, components)).toBe(true);
  });

  it("returns false when all values are empty", () => {
    const components = [makeComponent("a"), makeComponent("b")];
    const values: FormValues = { a: undefined, b: "" };
    expect(hasAnyUIComponentValues(values, components)).toBe(false);
  });

  it("returns false for empty components array", () => {
    expect(hasAnyUIComponentValues({}, [])).toBe(false);
  });

  it("returns true for a non-empty array value", () => {
    const components = [makeComponent("tags")];
    const values: FormValues = { tags: ["one"] };
    expect(hasAnyUIComponentValues(values, components)).toBe(true);
  });
});

describe("createEmptyUIComponentValues", () => {
  it("sets all non-number fields to undefined", () => {
    const components = [makeComponent("a"), makeComponent("b")];
    const result = createEmptyUIComponentValues(components);
    expect(result).toEqual({ a: undefined, b: undefined });
  });

  it("sets a number field with max prop to its max value", () => {
    const component = makeComponent("limit", {
      type: "number",
      props: { max: 100 },
    });
    const result = createEmptyUIComponentValues([component]);
    expect(result).toEqual({ limit: 100 });
  });

  it("sets a number field without max prop to undefined", () => {
    const component = makeComponent("limit", {
      type: "number",
      props: { min: 0 },
    });
    const result = createEmptyUIComponentValues([component]);
    expect(result).toEqual({ limit: undefined });
  });

  it("handles mixed field types correctly", () => {
    const components = [
      makeComponent("text", { type: "text" }),
      makeComponent("count", { type: "number", props: { max: 50 } }),
    ];
    const result = createEmptyUIComponentValues(components);
    expect(result).toEqual({ text: undefined, count: 50 });
  });

  it("returns empty object for empty components array", () => {
    expect(createEmptyUIComponentValues([])).toEqual({});
  });
});

describe("createPostSubmitValues", () => {
  const chatInputConfig = { id: "chat_input", flag: "--text", required: true };

  it("clears chatInputConfig value to undefined", () => {
    const current: FormValues = { chat_input: "some text" };
    const result = createPostSubmitValues([], current, chatInputConfig);
    expect(result).toEqual({ chat_input: undefined });
  });

  it("preserves all UIComponent values", () => {
    const components = [
      makeComponent("mode", {
        render_paths: ["workspace.conversationArea.inputSection.toolMode"],
      }),
      makeComponent("max_char_length", {
        type: "number",
        props: { max: 5000 },
      }),
    ];
    const current: FormValues = { mode: "write", max_char_length: 5000 };
    const result = createPostSubmitValues(components, current, chatInputConfig);
    expect(result).toEqual({
      mode: "write",
      max_char_length: 5000,
      chat_input: undefined,
    });
  });

  it("preserves UIComponent values and clears chatInputConfig", () => {
    const components = [
      makeComponent("mode", {
        render_paths: ["workspace.conversationArea.inputSection.toolMode"],
      }),
    ];
    const current: FormValues = { chat_input: "hello", mode: "write" };
    const result = createPostSubmitValues(components, current, chatInputConfig);
    expect(result).toEqual({ chat_input: undefined, mode: "write" });
  });

  it("preserves UIComponent values when no chatInputConfig", () => {
    const component = makeComponent("mode", {
      render_paths: ["workspace.conversationArea.inputSection.toolMode"],
    });
    const current: FormValues = { mode: "write" };
    const result = createPostSubmitValues([component], current);
    expect(result).toEqual({ mode: "write" });
  });

  it("returns empty object for empty components array and no chatInputConfig", () => {
    expect(createPostSubmitValues([], {})).toEqual({});
  });
});
