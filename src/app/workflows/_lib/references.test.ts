import { describe, expect, it } from "vitest";
import { collectDanglingReferences } from "./references";
import type { DependencyEdge } from "./collectDescendants";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";

const input = (key: string): WorkflowInputField => ({
  key,
  label: key,
  input: "text",
});

const fileInput = (key: string): WorkflowInputField => ({
  key,
  label: key,
  input: "file",
});

const edge = (source: string, target: string): DependencyEdge => ({
  source,
  target,
});

describe("collectDanglingReferences", () => {
  const node = (id: string, command?: string, toolName?: string) => ({
    id,
    data: { command, toolName },
  });

  it("flags an undeclared input reference", () => {
    const nodes = [node("s1", "@t --x=${inputs.missing}")];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s1")?.[0].code).toBe("DANGLING_INPUT_REFERENCE");
  });

  it("passes a declared input reference", () => {
    const nodes = [node("s1", "@t --x=${inputs.topic}")];
    const issues = collectDanglingReferences(nodes, [], [input("topic")]);
    expect(issues.has("s1")).toBe(false);
  });

  it("flags an output reference to a missing step", () => {
    const nodes = [node("s2", "@t --x=${outputs.gone.answer}")];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s2")?.[0].code).toBe("DANGLING_OUTPUT_REFERENCE");
  });

  it("flags an output reference to a non-ancestor step", () => {
    // s1 exists but there is no edge s1 → s2, so its output isn't available.
    const nodes = [node("s1"), node("s2", "@t --x=${outputs.s1.answer}")];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s2")?.[0].code).toBe("UNORDERED_OUTPUT_REFERENCE");
  });

  it("passes an output reference to a transitive ancestor", () => {
    const nodes = [node("s1"), node("s2", "@t --x=${outputs.s1.answer}")];
    const issues = collectDanglingReferences(nodes, [edge("s1", "s2")], []);
    expect(issues.has("s2")).toBe(false);
  });

  it("flags an output key the producer's tool doesn't declare", () => {
    const nodes = [
      node("s1", undefined, "search"),
      node("s2", "@t --x=${outputs.s1.missing}"),
    ];
    const getToolOutputs = (toolName: string | undefined) =>
      toolName === "search" ? [{ key: "answer" }] : undefined;
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      getToolOutputs
    );
    expect(issues.get("s2")?.[0].code).toBe("UNKNOWN_OUTPUT_REFERENCE");
  });

  it("accepts a drill-down into a declared object output", () => {
    // `data.score` walks into the `data` output's value; only `data` is a key
    // the tool declares, so judging the whole path against the declared list
    // would flag a reference the engine resolves fine.
    const nodes = [
      node("s1", undefined, "audit"),
      node("s2", "@t --x=${outputs.s1.data.score}"),
    ];
    const getToolOutputs = () => [{ key: "data" }];
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      getToolOutputs
    );
    expect(issues.has("s2")).toBe(false);
  });

  it("flags a keyless output reference with a missing-key message", () => {
    const nodes = [
      node("s1", undefined, "search"),
      node("s2", "@t --x=${outputs.s1}"),
    ];
    const getToolOutputs = () => [{ key: "answer" }];
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      getToolOutputs
    );
    expect(issues.get("s2")?.[0]).toMatchObject({
      code: "UNKNOWN_OUTPUT_REFERENCE",
      message: 'Reference to step "s1" is missing an output key.',
    });
  });

  it("passes a declared output key", () => {
    const nodes = [
      node("s1", undefined, "search"),
      node("s2", "@t --x=${outputs.s1.answer}"),
    ];
    const getToolOutputs = () => [{ key: "answer" }];
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      getToolOutputs
    );
    expect(issues.has("s2")).toBe(false);
  });

  it("skips the unknown-key check when the tool isn't in the registry", () => {
    const nodes = [
      node("s1", undefined, "search"),
      node("s2", "@t --x=${outputs.s1.anything}"),
    ];
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      () => undefined
    );
    expect(issues.has("s2")).toBe(false);
  });

  it("ignores nodes without commands and `other` roots", () => {
    const nodes = [node("s1"), node("s2", "@t --x=${state.foo}")];
    expect(collectDanglingReferences(nodes, [], []).size).toBe(0);
  });

  const boundNode = (
    id: string,
    fileBindings: Record<string, string>,
    toolName?: string
  ) => ({ id, data: { toolName, fileBindings } });

  it("flags a file binding to a missing producer step", () => {
    const nodes = [boundNode("s2", { source: "${outputs.gone.image}" })];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s2")?.[0].code).toBe("DANGLING_OUTPUT_REFERENCE");
  });

  it("flags a file binding to a non-ancestor step", () => {
    const nodes = [
      node("s1"),
      boundNode("s2", { source: "${outputs.s1.image}" }),
    ];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s2")?.[0].code).toBe("UNORDERED_OUTPUT_REFERENCE");
  });

  it("flags a file binding to an output the producer doesn't declare", () => {
    const nodes = [
      node("s1", undefined, "draw"),
      boundNode("s2", { source: "${outputs.s1.missing}" }),
    ];
    const getToolOutputs = (toolName: string | undefined) =>
      toolName === "draw" ? [{ key: "image" }] : undefined;
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      getToolOutputs
    );
    expect(issues.get("s2")?.[0].code).toBe("UNKNOWN_OUTPUT_REFERENCE");
  });

  it("passes a file binding to a declared output of an ancestor", () => {
    const nodes = [
      node("s1", undefined, "draw"),
      boundNode("s2", { source: "${outputs.s1.image}" }),
    ];
    const issues = collectDanglingReferences(
      nodes,
      [edge("s1", "s2")],
      [],
      () => [{ key: "image" }]
    );
    expect(issues.has("s2")).toBe(false);
  });

  it("passes a file binding to a declared file input", () => {
    const nodes = [boundNode("s2", { source: "${inputs.pic}" })];
    const issues = collectDanglingReferences(nodes, [], [fileInput("pic")]);
    expect(issues.has("s2")).toBe(false);
  });

  it("flags a file binding to a declared non-file input", () => {
    const nodes = [boundNode("s2", { source: "${inputs.topic}" })];
    const issues = collectDanglingReferences(nodes, [], [input("topic")]);
    expect(issues.get("s2")?.[0]).toMatchObject({
      code: "NON_FILE_INPUT_IN_SLOT",
      message: 'File slot references input "topic", which is not a file input.',
    });
  });

  it("flags a file binding to an undeclared input as dangling, not mismatched", () => {
    const nodes = [boundNode("s2", { source: "${inputs.missing}" })];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s2")?.map((i) => i.code)).toEqual([
      "DANGLING_INPUT_REFERENCE",
    ]);
  });

  it("flags a command referencing a file input", () => {
    const nodes = [node("s1", "@t --x=${inputs.pic}")];
    const issues = collectDanglingReferences(nodes, [], [fileInput("pic")]);
    expect(issues.get("s1")?.[0]).toMatchObject({
      code: "FILE_INPUT_IN_ARG",
      message:
        'Command references file input "pic"; file inputs can only feed file slots.',
    });
  });

  it("passes a command referencing a non-file input", () => {
    const nodes = [node("s1", "@t --x=${inputs.topic}")];
    const issues = collectDanglingReferences(nodes, [], [input("topic")]);
    expect(issues.has("s1")).toBe(false);
  });

  it("scans command and file bindings on the same node", () => {
    const nodes = [
      {
        id: "s2",
        data: {
          command: "@t --x=${inputs.missing}",
          fileBindings: { source: "${outputs.gone.image}" },
        },
      },
    ];
    const issues = collectDanglingReferences(nodes, [], []);
    expect(issues.get("s2")?.map((i) => i.code)).toEqual([
      "DANGLING_INPUT_REFERENCE",
      "DANGLING_OUTPUT_REFERENCE",
    ]);
  });
});
