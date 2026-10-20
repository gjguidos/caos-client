import { describe, expect, it } from "vitest";
import type {
  WorkflowDefinition,
  WorkflowStep,
} from "@/shared/lib/workflow/workflow.types";
import { buildWorkflowGraph, parseToolName } from "./workflowGraph";

function step(overrides: Partial<WorkflowStep> & { id: string }): WorkflowStep {
  return { type: "tool", ...overrides };
}

/** Edges as "source->target" strings for order-independent assertions. */
function edgeSet(definition: WorkflowDefinition): Set<string> {
  return new Set(
    buildWorkflowGraph(definition).edges.map((e) => `${e.source}->${e.target}`)
  );
}

describe("parseToolName", () => {
  it("extracts the leading @tool token", () => {
    expect(parseToolName("@writer_tool --x=1")).toBe("writer_tool");
  });

  it("handles a bare @tool with no args", () => {
    expect(parseToolName("@draw_tool")).toBe("draw_tool");
  });

  it("returns undefined for missing/non-@ commands", () => {
    expect(parseToolName(undefined)).toBeUndefined();
    expect(parseToolName("")).toBeUndefined();
    expect(parseToolName("writer_tool --x=1")).toBeUndefined();
  });
});

describe("buildWorkflowGraph — nodes", () => {
  it("creates one node per step, preserving id/type", () => {
    const graph = buildWorkflowGraph({
      steps: [step({ id: "a" }), step({ id: "b", type: "end" })],
    });
    expect(graph.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(graph.nodes[0].type).toBe("workflowStep");
    expect(graph.nodes[1].data.stepType).toBe("end");
  });

  it("represents every step type", () => {
    const graph = buildWorkflowGraph({
      execution_mode: "dag",
      steps: [
        step({ id: "t", type: "tool" }),
        step({ id: "p", type: "pause" }),
        step({ id: "s", type: "set" }),
        step({ id: "w", type: "wait_event" }),
        step({ id: "e", type: "end" }),
      ],
    });
    expect(graph.nodes.map((n) => n.data.stepType)).toEqual([
      "tool",
      "pause",
      "set",
      "wait_event",
      "end",
    ]);
  });

  it("extracts tool name only for tool steps", () => {
    const graph = buildWorkflowGraph({
      execution_mode: "dag",
      steps: [
        step({ id: "t", type: "tool", command: "@writer_tool --tone=x" }),
        step({ id: "p", type: "pause", command: "@ignored" }),
      ],
    });
    const t = graph.nodes.find((n) => n.id === "t");
    const p = graph.nodes.find((n) => n.id === "p");
    expect(t?.data.toolName).toBe("writer_tool");
    expect(p?.data.toolName).toBeUndefined();
  });

  it("labels: prefers label, then ui.label, then id", () => {
    const graph = buildWorkflowGraph({
      execution_mode: "dag",
      steps: [
        step({ id: "a", label: "Authored" }),
        step({ id: "b", ui: { label: "From UI" } }),
        step({ id: "c" }),
      ],
    });
    const byId = Object.fromEntries(
      graph.nodes.map((n) => [n.id, n.data.label])
    );
    expect(byId).toEqual({ a: "Authored", b: "From UI", c: "c" });
  });
});

describe("buildWorkflowGraph — edges", () => {
  it("(a) sequential default: chains a bare step list", () => {
    expect(
      edgeSet({
        execution_mode: "sequential",
        steps: [step({ id: "a" }), step({ id: "b" }), step({ id: "c" })],
      })
    ).toEqual(new Set(["a->b", "b->c"]));
  });

  it("defaults to sequential when execution_mode is unset", () => {
    expect(edgeSet({ steps: [step({ id: "a" }), step({ id: "b" })] })).toEqual(
      new Set(["a->b"])
    );
  });

  it("(b) explicit next: builds forward edges", () => {
    expect(
      edgeSet({
        execution_mode: "dag",
        steps: [
          step({ id: "a", next: ["b", "c"] }),
          step({ id: "b" }),
          step({ id: "c" }),
        ],
      })
    ).toEqual(new Set(["a->b", "a->c"]));
  });

  it("(c) explicit depends_on: builds backward edges", () => {
    expect(
      edgeSet({
        execution_mode: "dag",
        steps: [
          step({ id: "a" }),
          step({ id: "b", depends_on: ["a"] }),
          step({ id: "c", depends_on: ["a", "b"] }),
        ],
      })
    ).toEqual(new Set(["a->b", "a->c", "b->c"]));
  });

  it("(d) branching/fan-out and fan-in", () => {
    expect(
      edgeSet({
        execution_mode: "dag",
        steps: [
          step({ id: "root", next: ["x", "y"] }),
          step({ id: "x" }),
          step({ id: "y" }),
          step({ id: "join", depends_on: ["x", "y"] }),
        ],
      })
    ).toEqual(new Set(["root->x", "root->y", "x->join", "y->join"]));
  });

  it("does not imply sequential edges in dag mode", () => {
    expect(
      edgeSet({
        execution_mode: "dag",
        steps: [step({ id: "a" }), step({ id: "b" })],
      })
    ).toEqual(new Set());
  });

  it("sequential fallback skips steps that declare depends_on", () => {
    // b depends on a (explicit); c has no dep → implied from b.
    expect(
      edgeSet({
        execution_mode: "sequential",
        steps: [
          step({ id: "a" }),
          step({ id: "b", depends_on: ["a"] }),
          step({ id: "c" }),
        ],
      })
    ).toEqual(new Set(["a->b", "b->c"]));
  });

  it("dedupes edges and ignores self/unknown targets", () => {
    expect(
      edgeSet({
        execution_mode: "dag",
        steps: [
          step({ id: "a", next: ["b", "b", "a", "ghost"] }),
          step({ id: "b", depends_on: ["a"] }),
        ],
      })
    ).toEqual(new Set(["a->b"]));
  });

  it("handles an empty definition", () => {
    const graph = buildWorkflowGraph({ steps: [] });
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
