import { describe, expect, it } from "vitest";
import {
  extractReplyText,
  isEnvelope,
  pickPayloadFromWS,
} from "./messageParser";

describe("messageParser", () => {
  describe("isEnvelope", () => {
    const VALID_ENVELOPES = [
      { value: { renderables: [] }, description: "object with renderables" },
      { value: { raw: {} }, description: "object with raw" },
      { value: { success: true }, description: "object with success" },
      {
        value: { renderables: [], raw: {}, success: true },
        description: "object with multiple envelope properties",
      },
    ];

    it.each(VALID_ENVELOPES)("returns true for $description", ({ value }) => {
      expect(isEnvelope(value)).toBe(true);
    });

    const INVALID_ENVELOPES = [
      { value: null, description: "null" },
      { value: undefined, description: "undefined" },
      { value: "test", description: "string" },
      { value: 123, description: "number" },
      { value: true, description: "boolean" },
      { value: [], description: "array" },
      {
        value: { foo: "bar", baz: 123 },
        description: "object without envelope properties",
      },
      { value: {}, description: "empty object" },
    ];

    it.each(INVALID_ENVELOPES)(
      "returns false for $description",
      ({ value }) => {
        expect(isEnvelope(value)).toBe(false);
      }
    );
  });

  describe("pickPayloadFromWS", () => {
    const RENDERABLE_PAYLOAD = {
      renderables: [{ kind: "text", text: "hello" }],
    };
    const SIMPLE_TEXT = "simple text";
    const CUSTOM_DATA = { custom: "data" };

    it("extracts from response.message path", () => {
      const input = {
        response: {
          message: RENDERABLE_PAYLOAD,
        },
      };
      expect(pickPayloadFromWS(input)).toEqual(RENDERABLE_PAYLOAD);
    });

    it("extracts from result path", () => {
      const input = {
        result: RENDERABLE_PAYLOAD,
      };
      expect(pickPayloadFromWS(input)).toEqual(RENDERABLE_PAYLOAD);
    });

    it("extracts from data path", () => {
      const input = {
        data: RENDERABLE_PAYLOAD,
      };
      expect(pickPayloadFromWS(input)).toEqual(RENDERABLE_PAYLOAD);
    });

    it("extracts from response.result path", () => {
      const input = {
        response: {
          result: RENDERABLE_PAYLOAD,
        },
      };
      expect(pickPayloadFromWS(input)).toEqual(RENDERABLE_PAYLOAD);
    });

    it("extracts from response.data path", () => {
      const input = {
        response: {
          data: RENDERABLE_PAYLOAD,
        },
      };
      expect(pickPayloadFromWS(input)).toEqual(RENDERABLE_PAYLOAD);
    });

    it("falls back to root if envelope at root", () => {
      expect(pickPayloadFromWS(RENDERABLE_PAYLOAD)).toEqual(RENDERABLE_PAYLOAD);
    });

    it("falls back to response.message if not envelope", () => {
      const input = {
        response: {
          message: SIMPLE_TEXT,
        },
      };
      expect(pickPayloadFromWS(input)).toBe(SIMPLE_TEXT);
    });

    it("falls back to root if no nested paths and no envelope", () => {
      expect(pickPayloadFromWS(CUSTOM_DATA)).toEqual(CUSTOM_DATA);
    });

    const NULL_OR_EMPTY_CASES = [
      { value: null, expected: null, description: "null input" },
      { value: undefined, expected: undefined, description: "undefined input" },
      { value: {}, expected: {}, description: "empty object" },
    ];

    it.each(NULL_OR_EMPTY_CASES)(
      "handles $description",
      ({ value, expected }) => {
        expect(pickPayloadFromWS(value)).toEqual(expected);
      }
    );

    it("prioritizes response.message over other paths", () => {
      const PRIORITY_PAYLOAD = {
        renderables: [{ kind: "text", text: "priority" }],
      };
      const FALLBACK_PAYLOAD = {
        renderables: [{ kind: "text", text: "fallback" }],
      };
      const input = {
        response: {
          message: PRIORITY_PAYLOAD,
          result: FALLBACK_PAYLOAD,
        },
      };
      expect(pickPayloadFromWS(input)).toEqual(PRIORITY_PAYLOAD);
    });
  });

  describe("extractReplyText", () => {
    const NULL_CASES = [
      { value: null, description: "null input" },
      { value: undefined, description: "undefined input" },
    ];

    it.each(NULL_CASES)("returns null for $description", ({ value }) => {
      expect(extractReplyText(value)).toBeNull();
    });

    it("returns string input as-is", () => {
      const STRING_INPUT = "hello world";
      expect(extractReplyText(STRING_INPUT)).toBe(STRING_INPUT);
    });

    const RENDERABLE_CASES = [
      {
        payload: { renderables: [{ kind: "text", text: "Hello from agent" }] },
        expected: "Hello from agent",
        description: "text renderable",
      },
      {
        payload: { renderables: [{ kind: "markdown", markdown: "# Hello" }] },
        expected: "# Hello",
        description: "markdown renderable",
      },
      {
        payload: {
          renderables: [
            { kind: "image", src: "https://example.com/image.png" },
          ],
        },
        expected: "https://example.com/image.png",
        description: "image renderable",
      },
      {
        payload: {
          renderables: [{ kind: "link", href: "https://example.com" }],
        },
        expected: "https://example.com",
        description: "link renderable",
      },
    ];

    it.each(RENDERABLE_CASES)(
      "extracts from $description",
      ({ payload, expected }) => {
        expect(extractReplyText(payload)).toBe(expected);
      }
    );

    it("extracts from json renderable recursively", () => {
      const JSON_RENDERABLE = {
        renderables: [
          {
            kind: "json",
            value: {
              result: { text: "Extracted from JSON" },
            },
          },
        ],
      };
      expect(extractReplyText(JSON_RENDERABLE)).toBe("Extracted from JSON");
    });

    it("handles multiple renderables (joins with newline)", () => {
      const MULTIPLE_RENDERABLES = {
        renderables: [
          { kind: "text", text: "Line 1" },
          { kind: "text", text: "Line 2" },
          { kind: "markdown", markdown: "Line 3" },
        ],
      };
      expect(extractReplyText(MULTIPLE_RENDERABLES)).toBe(
        "Line 1\nLine 2\nLine 3"
      );
    });

    it("handles mixed renderables with different kinds", () => {
      const MIXED_RENDERABLES = {
        renderables: [
          { kind: "text", text: "Text" },
          { kind: "image", src: "https://example.com/img.png" },
          { kind: "link", href: "https://example.com" },
        ],
      };
      expect(extractReplyText(MIXED_RENDERABLES)).toBe(
        "Text\nhttps://example.com/img.png\nhttps://example.com"
      );
    });

    it("skips invalid renderables", () => {
      const INVALID_RENDERABLES = {
        renderables: [
          { kind: "text", text: "Valid" },
          null,
          undefined,
          "invalid",
          { kind: "text" }, // missing text property
          { kind: "text", text: "Also valid" },
        ],
      };
      expect(extractReplyText(INVALID_RENDERABLES)).toBe("Valid\nAlso valid");
    });

    it("handles empty renderables array", () => {
      const EMPTY_RENDERABLES = { renderables: [] };
      expect(extractReplyText(EMPTY_RENDERABLES)).toBe(
        JSON.stringify(EMPTY_RENDERABLES)
      );
    });

    it("handles nested session objects", () => {
      const SESSION_PAYLOAD = {
        message: "Session message",
        status: "active",
        session_id: "123",
      };
      expect(extractReplyText(SESSION_PAYLOAD)).toBe("Session message");
    });

    it("extracts from nested session with object message", () => {
      const NESTED_SESSION = {
        message: { text: "Nested text" },
        status: "active",
        session_id: "123",
      };
      expect(extractReplyText(NESTED_SESSION)).toBe("Nested text");
    });

    const RAW_PROPERTY_CASES = [
      {
        payload: { raw: { result: { text: "From raw result" } } },
        expected: "From raw result",
        description: "raw.result",
      },
      {
        payload: { raw: { data: { text: "From raw data" } } },
        expected: "From raw data",
        description: "raw.data",
      },
      {
        payload: { raw: { text: "Direct from raw" } },
        expected: "Direct from raw",
        description: "raw directly",
      },
    ];

    it.each(RAW_PROPERTY_CASES)(
      "extracts from $description",
      ({ payload, expected }) => {
        expect(extractReplyText(payload)).toBe(expected);
      }
    );

    const IMAGE_URL_1 = "https://example.com/1.png";
    const IMAGE_URL_2 = "https://example.com/2.png";
    const IMAGE_URL_3 = "https://example.com/3.png";
    const IMAGE_URL_4 = "https://example.com/4.png";

    it("extracts string URLs from images array", () => {
      const STRING_IMAGES = { images: [IMAGE_URL_1, IMAGE_URL_2] };
      expect(extractReplyText(STRING_IMAGES)).toBe(
        `${IMAGE_URL_1}\n${IMAGE_URL_2}`
      );
    });

    it("extracts URLs from images array (object format)", () => {
      const OBJECT_IMAGES = {
        images: [{ url: IMAGE_URL_1 }, { url: IMAGE_URL_2 }],
      };
      expect(extractReplyText(OBJECT_IMAGES)).toBe(
        `${IMAGE_URL_1}\n${IMAGE_URL_2}`
      );
    });

    it("extracts URLs from images array (array of URLs)", () => {
      const ARRAY_OF_URLS = {
        images: [{ url: [IMAGE_URL_1, IMAGE_URL_2] }],
      };
      expect(extractReplyText(ARRAY_OF_URLS)).toBe(
        `${IMAGE_URL_1}\n${IMAGE_URL_2}`
      );
    });

    it("handles mixed images array formats", () => {
      const MIXED_IMAGES = {
        images: [
          IMAGE_URL_1,
          { url: IMAGE_URL_2 },
          { url: [IMAGE_URL_3, IMAGE_URL_4] },
        ],
      };
      expect(extractReplyText(MIXED_IMAGES)).toBe(
        `${IMAGE_URL_1}\n${IMAGE_URL_2}\n${IMAGE_URL_3}\n${IMAGE_URL_4}`
      );
    });

    const FALLBACK_PROPERTY_CASES = [
      {
        payload: { formatted_local: "Formatted locally" },
        expected: "Formatted locally",
      },
      { payload: { formatted: "Formatted text" }, expected: "Formatted text" },
      { payload: { answer: "The answer" }, expected: "The answer" },
      { payload: { text: "Simple text" }, expected: "Simple text" },
      { payload: { content: "Content here" }, expected: "Content here" },
      { payload: { summary: "Summary text" }, expected: "Summary text" },
      { payload: { message: "Message text" }, expected: "Message text" },
    ];

    it.each(FALLBACK_PROPERTY_CASES)(
      "falls back to $expected property",
      ({ payload, expected }) => {
        expect(extractReplyText(payload)).toBe(expected);
      }
    );

    it("respects property priority order", () => {
      const PRIORITY_PAYLOAD = {
        formatted_local: "This wins",
        formatted: "Not this",
        answer: "Not this either",
        text: "Nope",
        content: "Nah",
        summary: "No",
      };
      expect(extractReplyText(PRIORITY_PAYLOAD)).toBe("This wins");
    });

    it("prioritizes message property when object has renderables/message/raw", () => {
      const MESSAGE_PRIORITY = {
        message: "Message wins",
        formatted_local: "Not this",
        formatted: "Not this either",
      };
      expect(extractReplyText(MESSAGE_PRIORITY)).toBe("Message wins");
    });

    it("skips empty string properties in fallback chain", () => {
      const EMPTY_PROPERTIES = {
        formatted_local: "",
        formatted: "  ",
        answer: "This one!",
      };
      expect(extractReplyText(EMPTY_PROPERTIES)).toBe("This one!");
    });

    const RECURSIVE_EXTRACTION_CASES = [
      {
        payload: { result: { text: "From nested result" } },
        expected: "From nested result",
        description: "result property",
      },
      {
        payload: { data: { text: "From nested data" } },
        expected: "From nested data",
        description: "data property",
      },
    ];

    it.each(RECURSIVE_EXTRACTION_CASES)(
      "extracts recursively from $description",
      ({ payload, expected }) => {
        expect(extractReplyText(payload)).toBe(expected);
      }
    );

    it("JSON stringifies unparseable objects", () => {
      const UNPARSEABLE = { custom: "data", number: 42 };
      expect(extractReplyText(UNPARSEABLE)).toBe(JSON.stringify(UNPARSEABLE));
    });

    it("handles objects that throw on JSON.stringify", () => {
      const CIRCULAR_OBJ: any = { a: 1 };
      CIRCULAR_OBJ.self = CIRCULAR_OBJ;
      const result = extractReplyText(CIRCULAR_OBJ);
      expect(result).toBe("[object Object]");
    });

    const PRIMITIVE_CASES = [
      { value: 123, expected: "123" },
      { value: true, expected: "true" },
      { value: false, expected: "false" },
    ];

    it.each(PRIMITIVE_CASES)(
      "converts $value to string",
      ({ value, expected }) => {
        expect(extractReplyText(value)).toBe(expected);
      }
    );

    it("handles renderables with message property preference", () => {
      const MESSAGE_PRIORITY = {
        message: "Direct message",
        renderables: [{ kind: "text", text: "Renderable text" }],
      };
      expect(extractReplyText(MESSAGE_PRIORITY)).toBe("Direct message");
    });

    it("falls through to renderables when message is empty", () => {
      const EMPTY_MESSAGE = {
        message: "",
        renderables: [{ kind: "text", text: "Renderable text" }],
      };
      expect(extractReplyText(EMPTY_MESSAGE)).toBe("Renderable text");
    });

    it("handles complex nested structure", () => {
      const COMPLEX_NESTED = {
        response: {
          message: {
            renderables: [
              { kind: "text", text: "Hello" },
              {
                kind: "json",
                value: {
                  result: {
                    data: {
                      formatted_local: "Deeply nested text",
                    },
                  },
                },
              },
            ],
          },
        },
      };
      expect(extractReplyText(COMPLEX_NESTED.response.message)).toBe("Hello");
    });

    it("handles renderables with only JSON kind (no text/markdown/etc)", () => {
      const JSON_ONLY = {
        renderables: [
          {
            kind: "json",
            value: {
              result: "Text from JSON",
            },
          },
        ],
      };
      expect(extractReplyText(JSON_ONLY)).toBe("Text from JSON");
    });
  });
});
