import { describe, expect, it } from "vitest";
import {
  buildInputReference,
  buildOutputReference,
  isBoundValue,
  isWholeReference,
  parseReferences,
} from "./references";

describe("token builders", () => {
  it("builds input references", () => {
    expect(buildInputReference("topic")).toBe("${inputs.topic}");
  });

  it("builds output references from a declared key", () => {
    expect(buildOutputReference("s1", "answer")).toBe("${outputs.s1.answer}");
    expect(buildOutputReference("s1", "count")).toBe("${outputs.s1.count}");
  });
});

describe("parseReferences", () => {
  it("classifies input, output, and other roots", () => {
    const refs = parseReferences(
      "@t --a=${inputs.topic} --b=${outputs.s1.answer} --c=${state.foo}"
    );
    expect(refs).toEqual([
      { raw: "inputs.topic", kind: "input", key: "topic" },
      {
        raw: "outputs.s1.answer",
        kind: "output",
        key: "s1",
        outputKey: "answer",
      },
      { raw: "state.foo", kind: "other" },
    ]);
  });

  it("splits the output key from the step id", () => {
    const [bare, keyed] = parseReferences(
      "${outputs.s1} ${outputs.s2.results}"
    );
    expect(bare).toMatchObject({ kind: "output", key: "s1", outputKey: "" });
    expect(keyed).toMatchObject({
      kind: "output",
      key: "s2",
      outputKey: "results",
    });
    expect(keyed.path).toBeUndefined();
  });

  it("keeps a drill-down separate from the declared output key", () => {
    // Segment 2 is always the key the producer's tool declares; anything after
    // it walks into that output's value. Folding the two together would make
    // the builder judge `data.score` against the declared key list.
    const [ref] = parseReferences("${outputs.audit.data.score}");
    expect(ref).toMatchObject({
      kind: "output",
      key: "audit",
      outputKey: "data",
      path: "score",
    });
  });

  it("keeps a multi-segment drill-down whole", () => {
    const [ref] = parseReferences("${outputs.audit.data.rows.0.score}");
    expect(ref).toMatchObject({ outputKey: "data", path: "rows.0.score" });
  });

  it("splits a drill-down before the inline default", () => {
    const [ref] = parseReferences("${outputs.audit.data.score|0}");
    expect(ref).toMatchObject({
      outputKey: "data",
      path: "score",
      fallback: "0",
    });
  });

  it("strips an inline default from the resolution expression and keeps it", () => {
    expect(parseReferences("${inputs.topic|Untitled}")).toEqual([
      {
        raw: "inputs.topic|Untitled",
        kind: "input",
        key: "topic",
        fallback: "Untitled",
      },
    ]);
  });
});

describe("whole reference detection", () => {
  it("detects a whole reference", () => {
    expect(isWholeReference("${inputs.topic}")).toBe(true);
    expect(isWholeReference("${inputs.topic|Untitled}")).toBe(true);
    expect(isWholeReference("Summarize: ${inputs.topic}")).toBe(false);
    expect(isWholeReference("plain")).toBe(false);
  });

  it("isBoundValue is true for any string containing a token", () => {
    expect(isBoundValue("${inputs.topic}")).toBe(true);
    expect(isBoundValue("a ${x} b")).toBe(true);
    expect(isBoundValue("plain")).toBe(false);
    expect(isBoundValue(42)).toBe(false);
  });
});
