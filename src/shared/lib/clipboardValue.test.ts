import { describe, expect, it } from "vitest";
import { formatForClipboard } from "./clipboardValue";

describe("formatForClipboard", () => {
  it("copies a string as itself, unquoted", () => {
    expect(formatForClipboard("A sleek desk lamp")).toBe("A sleek desk lamp");
  });

  it("copies numbers and booleans as they read on screen", () => {
    expect(formatForClipboard(92)).toBe("92");
    expect(formatForClipboard(false)).toBe("false");
  });

  it("states an absent value rather than copying nothing", () => {
    expect(formatForClipboard(null)).toBe("null");
    expect(formatForClipboard(undefined)).toBe("null");
  });

  it("copies a structure as the same pretty-printed JSON the pane shows", () => {
    expect(formatForClipboard({ score: 92 })).toBe('{\n  "score": 92\n}');
    expect(formatForClipboard(["a", "b"])).toBe('[\n  "a",\n  "b"\n]');
  });

  it("falls back to a plain string for a value JSON cannot take", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(formatForClipboard(circular)).toBe("[object Object]");
  });
});
