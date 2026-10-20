import { describe, expect, it } from "vitest";
import {
  buildInputEdges,
  buildInputNodes,
  gutterOrigin,
  inputEdgeId,
  inputNodeId,
  inputNodeIndex,
  removedInputIndexes,
  inputNodeDimensions,
  emphasizedInputEdgeIds,
  inputEdgeStyle,
} from "./inputNodes";
import type { InputUsage } from "./inputUsage";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { groupUsageByInputKey } from "./inputUsage";

const topic: WorkflowInputField = {
  key: "topic",
  label: "Topic",
  input: "text",
};
const doc: WorkflowInputField = { key: "doc", label: "Doc", input: "file" };

function usage(
  inputKey: string,
  stepId: string,
  componentId: string
): InputUsage {
  return {
    inputKey,
    stepId,
    stepLabel: stepId,
    target: { kind: "arg", componentId },
    fieldLabel: componentId,
    whole: true,
  };
}

const steps = [
  { position: { x: 300, y: 40 } },
  { position: { x: 600, y: 200 } },
];

describe("buildInputNodes", () => {
  it("places the gutter left of the leftmost step", () => {
    const nodes = buildInputNodes({
      inputs: [topic, doc],
      origin: gutterOrigin(steps),
      usageByKey: new Map(),
      selectedIndex: null,
    });
    expect(nodes.every((n) => n.position.x < 300)).toBe(true);
    expect(nodes[0].position.x).toBe(nodes[1].position.x);
    expect(nodes[1].position.y).toBeGreaterThan(nodes[0].position.y);
  });

  it("anchors on the topmost step, not on whichever comes first", () => {
    const reordered = [
      { position: { x: 600, y: 200 } },
      { position: { x: 300, y: 40 } },
    ];
    expect(
      buildInputNodes({
        inputs: [topic],
        origin: gutterOrigin(reordered),
        usageByKey: new Map(),
        selectedIndex: null,
      })[0].position
    ).toEqual(
      buildInputNodes({
        inputs: [topic],
        origin: gutterOrigin(steps),
        usageByKey: new Map(),
        selectedIndex: null,
      })[0].position
    );
  });

  it("still renders on an empty canvas", () => {
    const nodes = buildInputNodes({
      inputs: [topic],
      origin: gutterOrigin([]),
      usageByKey: new Map(),
      selectedIndex: null,
    });
    expect(nodes).toHaveLength(1);
    expect(Number.isFinite(nodes[0].position.x)).toBe(true);
  });

  it("ids by declaration index, deletable but not draggable or connectable", () => {
    const nodes = buildInputNodes({
      inputs: [topic, doc],
      origin: gutterOrigin(steps),
      usageByKey: new Map(),
      selectedIndex: null,
    });
    expect(nodes.map((n) => n.id)).toEqual([inputNodeId(0), inputNodeId(1)]);
    for (const node of nodes) {
      expect(node.draggable).toBe(false);
      expect(node.connectable).toBe(false);
      // React Flow's delete key skips `deletable: false` outright, so this is
      // what lets an input be removed from the canvas like any other node.
      expect(node.deletable).toBe(true);
    }
  });

  it("marks only the selected index as selected", () => {
    const nodes = buildInputNodes({
      inputs: [topic, doc],
      origin: gutterOrigin(steps),
      usageByKey: new Map(),
      selectedIndex: 1,
    });
    expect(nodes.map((n) => n.selected)).toEqual([false, true]);
  });

  it("carries the usage count from the grouped index", () => {
    const byKey = groupUsageByInputKey([
      usage("topic", "s1", "text"),
      usage("topic", "s1", "tone"),
    ]);
    const nodes = buildInputNodes({
      inputs: [topic, doc],
      origin: gutterOrigin(steps),
      usageByKey: byKey,
      selectedIndex: null,
    });
    expect(nodes[0].data.usageCount).toBe(2);
    expect(nodes[1].data.usageCount).toBe(0);
  });
});

describe("buildInputEdges", () => {
  it("emits one edge per (input, step) pair even for several fields", () => {
    const edges = buildInputEdges(
      [
        usage("topic", "s1", "text"),
        usage("topic", "s1", "tone"),
        usage("topic", "s2", "text"),
      ],
      [topic]
    );
    expect(edges.map((e) => e.id)).toEqual([
      inputEdgeId(0, "s1"),
      inputEdgeId(0, "s2"),
    ]);
    expect(edges[0].source).toBe(inputNodeId(0));
    expect(edges[0].target).toBe("s1");
  });

  it("ignores usages of undeclared keys", () => {
    expect(buildInputEdges([usage("nope", "s1", "text")], [topic])).toEqual([]);
  });
});

describe("emphasizedInputEdgeIds", () => {
  const edges = buildInputEdges(
    [
      usage("topic", "s1", "text"),
      usage("topic", "s2", "text"),
      usage("doc", "s2", "f"),
    ],
    [topic, doc]
  );

  it("keeps every edge on the canvas regardless of focus", () => {
    expect(edges.every((e) => !e.hidden)).toBe(true);
    expect(inputEdgeStyle(true)).not.toEqual(inputEdgeStyle(false));
  });

  it("emphasises nothing when nothing is focused or selected", () => {
    expect(emphasizedInputEdgeIds(edges, null, null).size).toBe(0);
  });

  it("emphasises every edge of a focused input node", () => {
    const ids = emphasizedInputEdgeIds(
      edges,
      { kind: "node", id: inputNodeId(0) },
      null
    );
    expect([...ids].sort()).toEqual([
      inputEdgeId(0, "s1"),
      inputEdgeId(0, "s2"),
    ]);
  });

  it("emphasises only the edges touching a focused step", () => {
    const ids = emphasizedInputEdgeIds(edges, { kind: "node", id: "s2" }, null);
    expect([...ids].sort()).toEqual([
      inputEdgeId(0, "s2"),
      inputEdgeId(1, "s2"),
    ]);
  });

  it("emphasises exactly the focused edge", () => {
    const ids = emphasizedInputEdgeIds(
      edges,
      { kind: "edge", id: inputEdgeId(1, "s2") },
      null
    );
    expect([...ids]).toEqual([inputEdgeId(1, "s2")]);
  });

  it("emphasises the selected step's and the selected input's edges", () => {
    expect([...emphasizedInputEdgeIds(edges, null, "s1")]).toEqual([
      inputEdgeId(0, "s1"),
    ]);
    expect([...emphasizedInputEdgeIds(edges, null, inputNodeId(1))]).toEqual([
      inputEdgeId(1, "s2"),
    ]);
  });
});

describe("removedInputIndexes", () => {
  it("picks out the declaration indices React Flow asks to delete", () => {
    expect(
      removedInputIndexes([
        { type: "remove", id: inputNodeId(2) },
        { type: "remove", id: "s1" },
        { type: "select", id: inputNodeId(0), selected: true },
      ])
    ).toEqual([2]);
  });

  it("orders them deepest first, so earlier removals can't shift later ones", () => {
    expect(
      removedInputIndexes([
        { type: "remove", id: inputNodeId(0) },
        { type: "remove", id: inputNodeId(3) },
        { type: "remove", id: inputNodeId(1) },
      ])
    ).toEqual([3, 1, 0]);
  });

  it("is empty when nothing is being removed", () => {
    expect(
      removedInputIndexes([
        { type: "position", id: "s1", position: { x: 1, y: 2 } },
        { type: "remove", id: "s2" },
      ])
    ).toEqual([]);
  });
});

describe("inputNodeIndex", () => {
  it("round-trips the declaration index out of a synthesized id", () => {
    expect(inputNodeIndex(inputNodeId(0))).toBe(0);
    expect(inputNodeIndex(inputNodeId(7))).toBe(7);
  });

  it("is null for a step id or a malformed one", () => {
    expect(inputNodeIndex("s1")).toBeNull();
    expect(inputNodeIndex("input:nope")).toBeNull();
  });
});

describe("inputNodeDimensions", () => {
  it("picks out the gutter measurements and ignores everything else", () => {
    expect(
      inputNodeDimensions([
        {
          type: "dimensions",
          id: inputNodeId(0),
          dimensions: { width: 180, height: 76 },
        },
        // A step's measurement belongs to the graph, not to the gutter cache.
        {
          type: "dimensions",
          id: "s1",
          dimensions: { width: 240, height: 90 },
        },
        // React Flow emits `dimensions` changes carrying only `resizing`.
        { type: "dimensions", id: inputNodeId(1), resizing: true },
        { type: "position", id: inputNodeId(0), position: { x: 1, y: 2 } },
      ])
    ).toEqual([[inputNodeId(0), { width: 180, height: 76 }]]);
  });
});

describe("buildInputNodes measurements", () => {
  // A rebuilt node replaces its identity, and `adoptUserNodes` takes
  // `internals.measured` from the incoming object alone. Without a carried
  // measurement it also drops `internals.handleBounds`, and the usage edges
  // anchored to that handle snap to the node's origin for a frame.
  it("carries a previous measurement onto the rebuilt node", () => {
    const measured = new Map([[inputNodeId(1), { width: 180, height: 92 }]]);
    const nodes = buildInputNodes({
      inputs: [topic, doc],
      origin: gutterOrigin(steps),
      usageByKey: new Map(),
      selectedIndex: null,
      measured,
    });
    expect(nodes[1].measured).toEqual({ width: 180, height: 92 });
  });

  it("leaves a never-measured node to its initial dimensions, so it is never hidden", () => {
    const nodes = buildInputNodes({
      inputs: [topic],
      origin: gutterOrigin(steps),
      usageByKey: new Map(),
      selectedIndex: null,
    });
    expect(nodes[0].measured).toBeUndefined();
    // `nodeHasDimensions` falls back to these, which is what keeps React Flow
    // from rendering the node `visibility: hidden` on its first frame.
    expect(nodes[0].initialWidth).toBeGreaterThan(0);
    expect(nodes[0].initialHeight).toBeGreaterThan(0);
  });
});
