import { describe, expect, it } from "vitest";
import {
  buildDefinitionFromGraph,
  graphToBuilderEdges,
  graphToBuilderNodes,
  mapIssuesToNodes,
  type BuilderNodeData,
} from "./builderGraph";
import type { WorkflowGraph } from "@/app/(workspace)/orchestration/_lib/workflowGraph";
import type { WorkflowValidationIssue } from "@/shared/api/fetch_workflows";

type TestNode = { id: string; data: BuilderNodeData };
type TestEdge = { source: string; target: string };

function toolNode(id: string, toolName: string, label?: string): TestNode {
  return {
    id,
    data: {
      stepType: "tool",
      label: label ?? toolName,
      command: `@${toolName}`,
      toolName,
    },
  };
}

function structuralNode(
  id: string,
  stepType: BuilderNodeData["stepType"],
  label: string
): TestNode {
  return { id, data: { stepType, label } };
}

describe("buildDefinitionFromGraph", () => {
  it("always emits execution_mode 'dag'", () => {
    const def = buildDefinitionFromGraph([], []);
    expect(def.execution_mode).toBe("dag");
    expect(def.steps).toEqual([]);
  });

  it("emits a tool step with its command and label", () => {
    const def = buildDefinitionFromGraph(
      [toolNode("a", "writer", "Draft")],
      []
    );
    expect(def.steps).toEqual([
      { id: "a", type: "tool", command: "@writer", label: "Draft" },
    ]);
  });

  it("does not emit a command for structural steps", () => {
    const def = buildDefinitionFromGraph(
      [structuralNode("p", "pause", "Pause")],
      []
    );
    expect(def.steps[0]).toEqual({ id: "p", type: "pause", label: "Pause" });
    expect(def.steps[0]).not.toHaveProperty("command");
  });

  it("turns edge A→B into B.depends_on = [A]", () => {
    const nodes = [toolNode("a", "x"), toolNode("b", "y")];
    const edges: TestEdge[] = [{ source: "a", target: "b" }];
    const def = buildDefinitionFromGraph(nodes, edges);
    const b = def.steps.find((s) => s.id === "b");
    expect(b?.depends_on).toEqual(["a"]);
    const a = def.steps.find((s) => s.id === "a");
    expect(a).not.toHaveProperty("depends_on");
  });

  it("merges multiple predecessors into depends_on (deduped, order-stable)", () => {
    const nodes = [toolNode("a", "x"), toolNode("b", "y"), toolNode("c", "z")];
    const edges: TestEdge[] = [
      { source: "a", target: "c" },
      { source: "b", target: "c" },
      { source: "a", target: "c" }, // duplicate
    ];
    const def = buildDefinitionFromGraph(nodes, edges);
    expect(def.steps.find((s) => s.id === "c")?.depends_on).toEqual(["a", "b"]);
  });

  it("ignores edges referencing dropped nodes", () => {
    const def = buildDefinitionFromGraph(
      [toolNode("a", "x")],
      [{ source: "ghost", target: "a" }]
    );
    expect(def.steps[0]).not.toHaveProperty("depends_on");
  });

  it("never emits a `next` field", () => {
    const def = buildDefinitionFromGraph(
      [toolNode("a", "x"), toolNode("b", "y")],
      [{ source: "a", target: "b" }]
    );
    for (const step of def.steps) expect(step).not.toHaveProperty("next");
  });

  it("emits non-empty file_bindings on a tool step", () => {
    const node: TestNode = {
      id: "sink",
      data: {
        stepType: "tool",
        label: "Sink",
        command: "@image_sink",
        toolName: "image_sink",
        fileBindings: { source: "${outputs.src1.image}" },
      },
    };
    const def = buildDefinitionFromGraph([node], []);
    expect(def.steps[0].file_bindings).toEqual({
      source: "${outputs.src1.image}",
    });
  });

  it("prunes empty slot values and omits an all-empty file_bindings map", () => {
    const node: TestNode = {
      id: "sink",
      data: {
        stepType: "tool",
        label: "Sink",
        command: "@image_sink",
        toolName: "image_sink",
        fileBindings: { source: "${outputs.src1.image}", reference: "  " },
      },
    };
    const def = buildDefinitionFromGraph([node], []);
    expect(def.steps[0].file_bindings).toEqual({
      source: "${outputs.src1.image}",
    });

    const cleared = buildDefinitionFromGraph(
      [{ ...node, data: { ...node.data, fileBindings: { source: "" } } }],
      []
    );
    expect(cleared.steps[0]).not.toHaveProperty("file_bindings");
  });

  it("never emits file_bindings on a non-tool step", () => {
    const node = structuralNode("p", "pause", "Pause");
    (node.data as BuilderNodeData).fileBindings = {
      source: "${outputs.a.image}",
    };
    const def = buildDefinitionFromGraph([node], []);
    expect(def.steps[0]).not.toHaveProperty("file_bindings");
  });
});

describe("graphToBuilderNodes / graphToBuilderEdges", () => {
  const graph: WorkflowGraph = {
    nodes: [
      {
        id: "a",
        type: "workflowStep",
        position: { x: 10, y: 20 },
        data: {
          step: { id: "a", type: "tool", command: "@writer" },
          label: "Draft",
          stepType: "tool",
          toolName: "writer",
        },
      },
      {
        id: "p",
        type: "workflowStep",
        position: { x: 30, y: 40 },
        data: {
          step: { id: "p", type: "pause" },
          label: "Pause",
          stepType: "pause",
        },
      },
    ],
    edges: [{ id: "e-a-p", source: "a", target: "p" }],
  };

  it("projects graph nodes onto builder nodes, preserving position and command", () => {
    expect(graphToBuilderNodes(graph)).toEqual([
      {
        id: "a",
        type: "builderStep",
        position: { x: 10, y: 20 },
        data: {
          stepType: "tool",
          label: "Draft",
          command: "@writer",
          toolName: "writer",
        },
      },
      {
        id: "p",
        type: "builderStep",
        position: { x: 30, y: 40 },
        data: {
          stepType: "pause",
          label: "Pause",
          command: undefined,
          toolName: undefined,
        },
      },
    ]);
  });

  it("reads file_bindings off the step into node data", () => {
    const withBindings: WorkflowGraph = {
      nodes: [
        {
          id: "sink",
          type: "workflowStep",
          position: { x: 0, y: 0 },
          data: {
            step: {
              id: "sink",
              type: "tool",
              command: "@image_sink",
              file_bindings: { source: "${outputs.src1.image}" },
            },
            label: "Sink",
            stepType: "tool",
            toolName: "image_sink",
          },
        },
      ],
      edges: [],
    };
    expect(graphToBuilderNodes(withBindings)[0].data.fileBindings).toEqual({
      source: "${outputs.src1.image}",
    });
  });

  it("round-trips edges through builder edges", () => {
    expect(graphToBuilderEdges(graph)).toEqual([
      { id: "e-a-p", source: "a", target: "p" },
    ]);
  });

  it("survives the definition → graph → builder → definition round-trip", () => {
    const builderNodes = graphToBuilderNodes(graph);
    const builderEdges = graphToBuilderEdges(graph);
    const def = buildDefinitionFromGraph(builderNodes, builderEdges);
    expect(def).toEqual({
      execution_mode: "dag",
      steps: [
        { id: "a", type: "tool", command: "@writer", label: "Draft" },
        { id: "p", type: "pause", label: "Pause", depends_on: ["a"] },
      ],
    });
  });
});

describe("mapIssuesToNodes", () => {
  const nodes = [toolNode("a", "writer"), toolNode("b", "writer")];

  it("routes an issue to its step_id", () => {
    const issues: WorkflowValidationIssue[] = [
      { code: "DAG_INVALID", message: "cycle", step_id: "a" },
    ];
    const { byNode, globalIssues } = mapIssuesToNodes(nodes, issues);
    expect(byNode.get("a")).toEqual([
      { code: "DAG_INVALID", message: "cycle" },
    ]);
    expect(globalIssues).toEqual([]);
  });

  it("fans a tool_key issue out to every matching node", () => {
    const issues: WorkflowValidationIssue[] = [
      { code: "TOOL_UNKNOWN", message: "no tool", tool_key: "writer" },
    ];
    const { byNode } = mapIssuesToNodes(nodes, issues);
    expect(byNode.get("a")).toHaveLength(1);
    expect(byNode.get("b")).toHaveLength(1);
  });

  it("treats an issue whose step_id matches no node as global", () => {
    const issues: WorkflowValidationIssue[] = [
      { code: "DAG_INVALID", message: "stale", step_id: "gone" },
    ];
    const { byNode, globalIssues } = mapIssuesToNodes(nodes, issues);
    expect(byNode.size).toBe(0);
    expect(globalIssues).toEqual(issues);
  });

  it("treats an unmatched tool_key and bare issues as global", () => {
    const issues: WorkflowValidationIssue[] = [
      { code: "TOOL_UNKNOWN", message: "ghost", tool_key: "ghost" },
      { code: "GENERIC", message: "boom" },
    ];
    const { byNode, globalIssues } = mapIssuesToNodes(nodes, issues);
    expect(byNode.size).toBe(0);
    expect(globalIssues).toHaveLength(2);
  });
});
